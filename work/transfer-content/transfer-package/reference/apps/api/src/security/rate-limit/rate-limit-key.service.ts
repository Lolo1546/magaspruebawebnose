import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { RateLimitKeySource, RateLimitType } from './rate-limit.types.js';

@Injectable()
export class RateLimitKeyService {
  private readonly pepper: string;

  constructor(private readonly configService: ConfigService) {
    this.pepper =
      this.configService.get<string>('AUTH_RATE_LIMIT_PEPPER') || '';
  }

  deriveKey(
    policyType: RateLimitType,
    identitySource: RateLimitKeySource,
    normalizedIdentity: string,
  ): string {
    if (!this.pepper) {
      throw new Error(
        'Internal Configuration Error: AUTH_RATE_LIMIT_PEPPER is not configured.',
      );
    }
    const hmac = crypto.createHmac('sha256', this.pepper);
    hmac.update(`${policyType}:${identitySource}:${normalizedIdentity}`);
    const digest = hmac.digest('hex');
    return `auth-rate-limit:${digest}`;
  }
}
