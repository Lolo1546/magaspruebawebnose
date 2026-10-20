import { Inject, Injectable, Optional } from '@nestjs/common';
import { RateLimitStorage } from './rate-limit-storage.port';
import {
  RateLimitBucketInput,
  RateLimitConsumeResult,
  StoredBucket,
} from './rate-limit.types';

export const MAX_BUCKETS_TOKEN = 'MAX_BUCKETS_TOKEN';
export const EVICTION_BATCH_SIZE_TOKEN = 'EVICTION_BATCH_SIZE_TOKEN';

@Injectable()
export class InMemoryRateLimitStorage implements RateLimitStorage {
  private readonly store = new Map<string, StoredBucket>();
  private readonly maxBuckets: number;
  private readonly evictionBatchSize: number;

  constructor(
    @Optional() @Inject(MAX_BUCKETS_TOKEN) maxBuckets?: number,
    @Optional() @Inject(EVICTION_BATCH_SIZE_TOKEN) evictionBatchSize?: number,
  ) {
    this.maxBuckets = maxBuckets ?? 50000;
    this.evictionBatchSize = evictionBatchSize ?? 100;
  }

  consume(
    buckets: readonly RateLimitBucketInput[],
    nowMilliseconds: number,
  ): Promise<RateLimitConsumeResult> {
    if (!Number.isFinite(nowMilliseconds) || nowMilliseconds < 0) {
      return Promise.reject(
        new Error('nowMilliseconds must be a finite positive number'),
      );
    }

    if (!buckets || buckets.length === 0) {
      return Promise.resolve({
        allowed: true,
        retryAfterSeconds: 0,
      });
    }

    const seenKeys = new Set<string>();
    for (const b of buckets) {
      if (!b.key || typeof b.key !== 'string' || b.key.trim() === '') {
        return Promise.reject(
          new Error('Bucket key must be a non-empty string'),
        );
      }
      if (!Number.isInteger(b.limit) || b.limit <= 0) {
        return Promise.reject(
          new Error('Bucket limit must be a positive integer'),
        );
      }
      if (!Number.isInteger(b.windowSeconds) || b.windowSeconds <= 0) {
        return Promise.reject(
          new Error('Bucket windowSeconds must be a positive integer'),
        );
      }
      if (seenKeys.has(b.key)) {
        return Promise.reject(
          new Error(`Duplicate bucket key detected: ${b.key}`),
        );
      }
      seenKeys.add(b.key);
    }

    let allAllowed = true;
    let maxRetryAfter = 0;

    for (const b of buckets) {
      let stored = this.store.get(b.key);

      if (!stored || stored.expiresAtMilliseconds <= nowMilliseconds) {
        if (!stored) {
          this.evictIfNecessary(nowMilliseconds);
        }
        stored = {
          tokens: b.limit,
          expiresAtMilliseconds: nowMilliseconds + b.windowSeconds * 1000,
        };
        this.store.set(b.key, stored);
      }

      if (stored.tokens > 0) {
        stored.tokens -= 1;
        this.store.set(b.key, stored);
      } else {
        allAllowed = false;
        const retryAfter = Math.ceil(
          (stored.expiresAtMilliseconds - nowMilliseconds) / 1000,
        );
        if (retryAfter > maxRetryAfter) {
          maxRetryAfter = retryAfter;
        }
      }
    }

    return Promise.resolve({
      allowed: allAllowed,
      retryAfterSeconds: maxRetryAfter,
    });
  }

  private evictIfNecessary(nowMilliseconds: number): void {
    if (this.store.size < this.maxBuckets) {
      return;
    }

    let evicted = 0;
    const expiredKeys: string[] = [];
    const validBuckets: { key: string; expiresAt: number }[] = [];

    // Primero recolectar expirados y construir array de válidos
    for (const [key, bucket] of this.store.entries()) {
      if (bucket.expiresAtMilliseconds <= nowMilliseconds) {
        expiredKeys.push(key);
      } else {
        validBuckets.push({
          key,
          expiresAt: bucket.expiresAtMilliseconds,
        });
      }
    }

    // Borrar expirados primero
    for (const key of expiredKeys) {
      this.store.delete(key);
      evicted++;
      if (evicted >= this.evictionBatchSize) {
        return;
      }
    }

    if (evicted === 0 && this.store.size >= this.maxBuckets) {
      // Ordenar por expiración (los más próximos a expirar primero)
      // Como Map preserva el orden de inserción, si hay empate en expiresAt,
      // el orden estable del sort de JS mantendrá el orden de inserción.
      validBuckets.sort((a, b) => a.expiresAt - b.expiresAt);

      for (const item of validBuckets) {
        this.store.delete(item.key);
        evicted++;
        if (evicted >= this.evictionBatchSize) {
          return;
        }
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
