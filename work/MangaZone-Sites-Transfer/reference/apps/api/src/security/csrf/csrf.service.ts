import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';
import csrfConfig from '../../config/csrf.config';

@Injectable()
export class CsrfService {
  constructor(
    @Inject(csrfConfig.KEY)
    private readonly csrfConf: ConfigType<typeof csrfConfig>,
  ) {}

  generateToken(sessionId: string): string {
    if (typeof sessionId !== 'string') {
      throw new Error('Session ID must be a string');
    }
    if (sessionId.length === 0 || sessionId.trim().length === 0) {
      throw new Error('Session ID cannot be empty or whitespace-only');
    }
    if (sessionId.length > 128) {
      throw new Error('Session ID exceeds maximum allowed length');
    }

    const payloadString = `v1.${sessionId}`;
    const signatureBuffer = crypto
      .createHmac('sha256', this.csrfConf.secret)
      .update(payloadString, 'utf8')
      .digest();

    const payloadBase64 = Buffer.from(payloadString, 'utf8').toString(
      'base64url',
    );
    const signatureBase64 = signatureBuffer.toString('base64url');

    return `${payloadBase64}.${signatureBase64}`;
  }

  verifyToken(token: string, expectedSessionId: string): boolean {
    if (typeof token !== 'string' || token.length > 512) {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [payloadBase64, signatureBase64] = parts;
    if (!payloadBase64 || !signatureBase64) {
      return false;
    }

    // Strict base64url validation regex
    if (
      !/^[A-Za-z0-9_-]+$/.test(payloadBase64) ||
      !/^[A-Za-z0-9_-]+$/.test(signatureBase64)
    ) {
      return false;
    }

    let decodedPayload: string;
    let decodedSignature: Buffer;

    try {
      const rawPayloadBuffer = Buffer.from(payloadBase64, 'base64url');
      decodedPayload = new TextDecoder('utf-8', { fatal: true }).decode(
        rawPayloadBuffer,
      );
      decodedSignature = Buffer.from(signatureBase64, 'base64url');
    } catch {
      return false;
    }

    if (decodedSignature.length !== 32) {
      return false;
    }

    const payloadParts = decodedPayload.split('.');
    if (payloadParts.length !== 2) {
      return false;
    }

    const [version, sessionId] = payloadParts;
    if (version !== 'v1') {
      return false;
    }
    if (!sessionId || sessionId !== expectedSessionId) {
      return false;
    }

    const expectedSignatureBuffer = crypto
      .createHmac('sha256', this.csrfConf.secret)
      .update(decodedPayload, 'utf8')
      .digest();

    if (decodedSignature.length !== expectedSignatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(decodedSignature, expectedSignatureBuffer);
  }
}
