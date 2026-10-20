export interface RateLimitPolicy {
  windowSeconds: number;
  maxRequests: number;
}

export type RateLimitType =
  | 'FORGOT_PASSWORD_IP'
  | 'FORGOT_PASSWORD_AUTH_EMAIL'
  | 'RESET_PASSWORD_IP'
  | 'LOGIN_IP'
  | 'LOGIN_AUTH_EMAIL'
  | 'REGISTER_IP'
  | 'RESEND_VERIFICATION_USER'
  | 'VERIFY_EMAIL_IP';

export const AUTH_RATE_LIMIT_POLICIES: Record<RateLimitType, RateLimitPolicy> =
  {
    FORGOT_PASSWORD_IP: { windowSeconds: 60 * 60, maxRequests: 3 },
    FORGOT_PASSWORD_AUTH_EMAIL: { windowSeconds: 60 * 60, maxRequests: 3 },
    RESET_PASSWORD_IP: { windowSeconds: 15 * 60, maxRequests: 5 },
    LOGIN_IP: { windowSeconds: 15 * 60, maxRequests: 20 },
    LOGIN_AUTH_EMAIL: { windowSeconds: 60 * 60, maxRequests: 5 },
    REGISTER_IP: { windowSeconds: 60 * 60, maxRequests: 5 },
    RESEND_VERIFICATION_USER: { windowSeconds: 60 * 60, maxRequests: 3 },
    VERIFY_EMAIL_IP: { windowSeconds: 15 * 60, maxRequests: 10 },
  };

export interface StoredBucket {
  tokens: number;
  expiresAtMilliseconds: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export type RateLimitKeySource =
  'client-ip' | 'auth-email' | 'authenticated-user';

export interface RateLimitMetadata {
  type: RateLimitType;
  identitySource: RateLimitKeySource;
}

export interface RateLimitBucketInput {
  key: string;
  limit: number;
  windowSeconds: number;
}
