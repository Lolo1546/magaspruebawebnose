import { SetMetadata } from '@nestjs/common';
import { RateLimitMetadata } from './rate-limit.types';

export const AUTH_RATE_LIMIT_KEY = 'auth_rate_limit';

export const AuthRateLimit = (...metadata: RateLimitMetadata[]) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, metadata);
