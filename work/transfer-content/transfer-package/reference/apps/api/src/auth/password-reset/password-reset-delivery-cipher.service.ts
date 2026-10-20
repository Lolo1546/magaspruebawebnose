import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const CIPHER_VERSION = 'v1';
const CIPHER_ALGORITHM = 'aes-256-gcm';
const CIPHER_IV_BYTES = 12;
const CIPHER_AUTH_TAG_BYTES = 16;
const CIPHER_PURPOSE = 'mangazone:password-reset-job-delivery';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PasswordResetDeliveryCipherContext = {
  jobId: string;
  passwordResetTokenId: string;
};

function createContextAad(context: PasswordResetDeliveryCipherContext): Buffer {
  if (
    !UUID_PATTERN.test(context.jobId) ||
    !UUID_PATTERN.test(context.passwordResetTokenId)
  ) {
    throw new Error('Invalid password reset delivery context.');
  }

  return Buffer.from(
    JSON.stringify({
      purpose: CIPHER_PURPOSE,
      version: 1,
      jobId: context.jobId,
      passwordResetTokenId: context.passwordResetTokenId,
    }),
    'utf8',
  );
}

function decodeCanonicalBase64Url(segment: string): Buffer {
  if (!BASE64URL_PATTERN.test(segment)) {
    throw new Error('Invalid password reset delivery envelope.');
  }
  const decoded = Buffer.from(segment, 'base64url');
  if (decoded.length === 0 || decoded.toString('base64url') !== segment) {
    throw new Error('Invalid password reset delivery envelope.');
  }
  return decoded;
}

@Injectable()
export class PasswordResetDeliveryCipherService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const encodedKey = configService.getOrThrow<string>(
      'PASSWORD_RESET_QUEUE_ENCRYPTION_KEY',
    );
    const key = Buffer.from(encodedKey, 'base64url');
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(encodedKey) ||
      key.length !== 32 ||
      key.toString('base64url') !== encodedKey
    ) {
      throw new Error('Invalid password reset queue encryption key.');
    }
    this.key = key;
  }

  encrypt(token: string, context: PasswordResetDeliveryCipherContext): string {
    const iv = crypto.randomBytes(CIPHER_IV_BYTES);
    const aad = createContextAad(context);
    const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, this.key, iv, {
      authTagLength: CIPHER_AUTH_TAG_BYTES,
    });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      CIPHER_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(
    envelope: string,
    context: PasswordResetDeliveryCipherContext,
  ): string {
    const parts = envelope.split('.');
    if (parts.length !== 4 || parts[0] !== CIPHER_VERSION) {
      throw new Error('Invalid password reset delivery envelope.');
    }
    const iv = decodeCanonicalBase64Url(parts[1] ?? '');
    const authTag = decodeCanonicalBase64Url(parts[2] ?? '');
    const ciphertext = decodeCanonicalBase64Url(parts[3] ?? '');
    if (
      iv.length !== CIPHER_IV_BYTES ||
      authTag.length !== CIPHER_AUTH_TAG_BYTES ||
      ciphertext.length === 0
    ) {
      throw new Error('Invalid password reset delivery envelope.');
    }
    const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, this.key, iv, {
      authTagLength: CIPHER_AUTH_TAG_BYTES,
    });
    decipher.setAAD(createContextAad(context));
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
