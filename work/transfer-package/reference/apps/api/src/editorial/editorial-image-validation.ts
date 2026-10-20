import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { finalizeError } from './editorial-finalize.errors.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function assertStaticPng(bytes: Buffer): void {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error();
  let offset = 8;
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) throw new Error();
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) throw new Error();
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (offset === 8 && (type !== 'IHDR' || length !== 13)) throw new Error();
    // Also reject orphan frame chunks; Sharp may silently ignore APNG extensions.
    if (['acTL', 'fcTL', 'fdAT'].includes(type)) throw new Error();
    offset += length + 12;
    if (type === 'IEND') {
      if (length !== 0 || offset !== bytes.length) throw new Error();
      return;
    }
  }
  throw new Error();
}

function assertStaticWebp(bytes: Buffer): void {
  if (
    bytes.length < 12 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP' ||
    bytes.readUInt32LE(4) !== bytes.length - 8
  )
    throw new Error();
  let offset = 12;
  let images = 0;
  while (offset < bytes.length) {
    if (bytes.length - offset < 8) throw new Error();
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const paddedLength = length + (length % 2);
    if (paddedLength > bytes.length - offset - 8) throw new Error();
    if (length % 2 && bytes[offset + 8 + length] !== 0) throw new Error();
    if (type === 'ANIM' || type === 'ANMF') throw new Error();
    if (type === 'VP8X' && (length !== 10 || bytes[offset + 8] & 0x02))
      throw new Error();
    if (type === 'VP8 ' || type === 'VP8L') images += 1;
    offset += 8 + paddedLength;
  }
  if (images !== 1) throw new Error();
}

export async function validateEditorialImage(
  bytes: Buffer,
  contentType: string,
  expectedBytes: bigint,
  policy: { maxBytes: number; maxPixels: number },
) {
  if (bytes.length > policy.maxBytes)
    throw finalizeError('UPLOAD_TOO_LARGE', 400);
  if (bytes.length === 0 || BigInt(bytes.length) !== expectedBytes)
    throw finalizeError('UPLOAD_SIZE_MISMATCH', 400);
  // Reject active/unsupported containers before invoking a decoder (not validation by magic alone).
  const format = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? 'jpeg'
    : bytes.subarray(0, 8).equals(PNG_SIGNATURE)
      ? 'png'
      : bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP'
        ? 'webp'
        : null;
  if (!format) throw finalizeError('UPLOAD_UNSUPPORTED_FORMAT', 400);
  const mimeType = `image/${format}`;
  if (contentType !== mimeType)
    throw finalizeError('UPLOAD_MIME_MISMATCH', 400);
  try {
    if (format === 'png') assertStaticPng(bytes);
    if (format === 'webp') assertStaticWebp(bytes);
    const options = {
      failOn: 'warning' as const,
      limitInputPixels: policy.maxPixels,
      animated: true,
    };
    const metadata = await sharp(bytes, options).metadata();
    const width = metadata.width;
    const height = metadata.pageHeight ?? metadata.height;
    const pages = metadata.pages ?? 1;
    if (
      metadata.format !== format ||
      pages !== 1 ||
      !width ||
      !height ||
      width * height * pages > policy.maxPixels
    )
      throw new Error();
    // Only the output pipeline applies Sharp's native timeout. Never promote raw output.
    // Do not retain its buffer: four uchar channels bound output to 4 * pixel budget.
    const { info } = await sharp(bytes, options)
      .toColourspace('srgb')
      .ensureAlpha()
      .raw({ depth: 'uchar' })
      .timeout({ seconds: 10 })
      .toBuffer({ resolveWithObject: true });
    if (
      info.width !== width ||
      info.height !== height ||
      info.channels !== 4 ||
      info.size !== width * height * 4
    )
      throw new Error();
    return {
      mimeType,
      width,
      height,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  } catch {
    throw finalizeError('UPLOAD_INVALID_IMAGE', 400);
  }
}
