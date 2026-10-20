import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import {
  RATE_LIMIT_STORAGE,
  type RateLimitStorage,
} from '../security/rate-limit/rate-limit-storage.port.js';

@Injectable()
export class MangaCommentRateLimitGuard implements CanActivate {
  constructor(
    @Inject(RATE_LIMIT_STORAGE) private readonly storage: RateLimitStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) throw new HttpException('Authentication required', 401);
    const userId = assertActiveMutationActor(request.auth);
    const edit = request.method === 'PATCH';
    // Server-owned UUID keys stay in RAM only; no body, IP or other PII is stored.
    const buckets = edit
      ? [{ key: `manga-comment:edit:${userId}`, limit: 10, windowSeconds: 60 }]
      : [
          {
            key: `manga-comment:create:minute:${userId}`,
            limit: 5,
            windowSeconds: 60,
          },
          {
            key: `manga-comment:create:hour:${userId}`,
            limit: 50,
            windowSeconds: 3600,
          },
        ];
    const result = await this.storage.consume(buckets, Date.now());
    if (!result.allowed) {
      context
        .switchToHttp()
        .getResponse<Response>()
        .setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new HttpException(
        {
          code: 'MANGA_COMMENT_RATE_LIMITED',
          message: 'Espera antes de volver a comentar.',
        },
        429,
      );
    }
    return true;
  }
}
