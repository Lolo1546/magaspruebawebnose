import {
  RateLimitBucketInput,
  RateLimitConsumeResult,
} from './rate-limit.types';

export const RATE_LIMIT_STORAGE = Symbol('RATE_LIMIT_STORAGE');

export interface RateLimitStorage {
  consume(
    buckets: readonly RateLimitBucketInput[],
    nowMilliseconds: number,
  ): Promise<RateLimitConsumeResult>;
}
