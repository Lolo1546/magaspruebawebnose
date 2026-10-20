import { validateEditorialImage } from './editorial-image-validation.js';
import { COVER_MAX_BYTES } from './editorial-upload.policy.js';

export const COVER_MAX_DECODE_PIXELS = 16_777_216;

export function validateCover(
  bytes: Buffer,
  contentType: string,
  expectedBytes: bigint,
) {
  return validateEditorialImage(bytes, contentType, expectedBytes, {
    maxBytes: COVER_MAX_BYTES,
    maxPixels: COVER_MAX_DECODE_PIXELS,
  });
}
