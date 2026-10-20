import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import {
  StorageObjectError,
  StorageObjectAlreadyExistsError,
} from './storage-object.errors.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectStorage, type SignedUpload } from './object-storage.port.js';
import { parseStorageConfig } from './storage.config.js';
import {
  isReadyObjectKey,
  isSafeObjectKey,
  isEditorialTemporaryKey,
  isFinalCoverKey,
  isFinalPageKey,
  isFinalThumbnailKey,
} from './storage-key.js';

export const DOWNLOAD_TTL_SECONDS = 60;
export const MAX_UPLOAD_TTL_SECONDS = 300;

@Injectable()
export class S3ObjectStorage extends ObjectStorage implements OnModuleDestroy {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;

  constructor(config: ConfigService) {
    super();
    const settings = parseStorageConfig(
      Object.fromEntries(
        [
          'NODE_ENV',
          'OBJECT_STORAGE_ENDPOINT',
          'OBJECT_STORAGE_REGION',
          'OBJECT_STORAGE_BUCKET',
          'OBJECT_STORAGE_ACCESS_KEY',
          'OBJECT_STORAGE_SECRET_KEY',
          'OBJECT_STORAGE_FORCE_PATH_STYLE',
        ].map((key) => [key, config.get(key)]),
      ),
    );
    this.bucket = settings?.bucket ?? null;
    this.client = settings
      ? new S3Client({
          endpoint: settings.endpoint,
          region: settings.region,
          forcePathStyle: settings.forcePathStyle,
          credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
          },
          // Do not sign a checksum for an empty SDK body: the browser sends the actual file.
          requestChecksumCalculation: 'WHEN_REQUIRED',
        })
      : null;
  }

  async createPresignedUpload(input: {
    key: string;
    contentType: string;
    expectedBytes: number;
    expiresAt: Date;
    now: Date;
  }): Promise<SignedUpload> {
    try {
      const expiresIn = Math.floor(
        (input.expiresAt.getTime() - input.now.getTime()) / 1000,
      );
      if (
        !this.client ||
        !this.bucket ||
        !isSafeObjectKey(input.key) ||
        !input.key.startsWith('tmp/editorial/') ||
        !Number.isSafeInteger(input.expectedBytes) ||
        input.expectedBytes <= 0 ||
        !Number.isFinite(expiresIn) ||
        expiresIn < 1 ||
        expiresIn > MAX_UPLOAD_TTL_SECONDS
      )
        throw new Error();
      const signedUploadUrl = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          ContentType: input.contentType,
          ContentLength: input.expectedBytes,
        }),
        {
          expiresIn,
          signingDate: input.now,
          signableHeaders: new Set(['content-type', 'content-length']),
        },
      );
      return {
        method: 'PUT',
        signedUploadUrl,
        headers: {
          'Content-Type': input.contentType,
          'Content-Length': String(input.expectedBytes),
        },
      };
    } catch {
      throw this.unavailable();
    }
  }

  async createPresignedDownload(key: string): Promise<string> {
    try {
      if (!this.client || !this.bucket || !isReadyObjectKey(key))
        throw new Error();
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ResponseCacheControl: 'private, no-store',
          ResponseContentDisposition: 'inline',
        }),
        { expiresIn: DOWNLOAD_TTL_SECONDS },
      );
    } catch {
      throw this.unavailable();
    }
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }

  async readTemporary(key: string, maxBytes: number) {
    let body: Readable | undefined;
    try {
      if (
        !this.client ||
        !this.bucket ||
        !isEditorialTemporaryKey(key) ||
        !Number.isSafeInteger(maxBytes) ||
        maxBytes < 1 ||
        maxBytes > 20_971_520
      )
        throw new Error();
      // One GET gives metadata and bytes from the same object snapshot, unlike HEAD + GET.
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      if (!(result.Body instanceof Readable)) throw new Error();
      body = result.Body;
      if (result.ContentLength !== undefined && result.ContentLength > maxBytes)
        throw new StorageObjectError('TOO_LARGE');
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of body) {
        if (!(chunk instanceof Uint8Array)) throw new Error();
        size += chunk.byteLength;
        if (size > maxBytes) throw new StorageObjectError('TOO_LARGE');
        chunks.push(Buffer.from(chunk));
      }
      if (result.ContentLength === undefined || result.ContentLength !== size)
        throw new StorageObjectError('SIZE_MISMATCH');
      return {
        bytes: Buffer.concat(chunks, size),
        contentType: result.ContentType ?? '',
      };
    } catch (error) {
      if (error instanceof StorageObjectError) throw error;
      if (error instanceof Error && error.name === 'NoSuchKey')
        throw new StorageObjectError('MISSING');
      throw this.unavailable();
    } finally {
      body?.destroy();
    }
  }

  async putFinal(
    key: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      if (
        !this.client ||
        !this.bucket ||
        !(
          isFinalCoverKey(key) ||
          isFinalPageKey(key) ||
          isFinalThumbnailKey(key)
        ) ||
        bytes.length < 1 ||
        bytes.length >
          (isFinalThumbnailKey(key)
            ? 5_242_880
            : isFinalPageKey(key)
              ? 20_971_520
              : 10_485_760) ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)
      )
        throw new Error();
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: bytes,
          ContentType: contentType,
          ContentLength: bytes.length,
          CacheControl: 'private, no-store',
          IfNoneMatch: '*',
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'PreconditionFailed' ||
          ('$metadata' in error &&
            typeof error.$metadata === 'object' &&
            error.$metadata !== null &&
            'httpStatusCode' in error.$metadata &&
            error.$metadata.httpStatusCode === 412))
      )
        throw new StorageObjectAlreadyExistsError();
      throw this.unavailable();
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      if (
        !this.client ||
        !this.bucket ||
        !(
          isEditorialTemporaryKey(key) ||
          isFinalCoverKey(key) ||
          isFinalPageKey(key) ||
          isFinalThumbnailKey(key)
        )
      )
        throw new Error();
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    } catch {
      throw this.unavailable();
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      statusCode: 503,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Media storage is unavailable.',
    });
  }
}
