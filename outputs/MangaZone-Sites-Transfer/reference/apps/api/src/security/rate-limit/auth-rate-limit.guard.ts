import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AUTH_RATE_LIMIT_KEY } from './auth-rate-limit.decorator';
import {
  AUTH_RATE_LIMIT_POLICIES,
  RateLimitBucketInput,
  RateLimitKeySource,
  RateLimitMetadata,
} from './rate-limit.types';
import { RATE_LIMIT_STORAGE } from './rate-limit-storage.port';
import type { RateLimitStorage } from './rate-limit-storage.port';
import { RateLimitKeyService } from './rate-limit-key.service';
import { ClientIpService } from '../client-ip/client-ip.service';
import { normalizeAuthEmail } from '../../auth/identity/auth-identity-normalizer';
import { AuthRateLimitException } from './rate-limit.exception';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly enabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(RATE_LIMIT_STORAGE)
    private readonly storage: RateLimitStorage,
    private readonly keyService: RateLimitKeyService,
    private readonly clientIpService: ClientIpService,
  ) {
    this.enabled =
      this.configService.get<boolean>('AUTH_RATE_LIMIT_ENABLED') === true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const metadatas = this.reflector.getAllAndOverride<RateLimitMetadata[]>(
      AUTH_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadatas || metadatas.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const bucketInputs: RateLimitBucketInput[] = [];

    for (const metadata of metadatas) {
      const rawValue = this.extractIdentity(metadata.identitySource, request);

      if (!rawValue) {
        continue;
      }

      const key = this.keyService.deriveKey(
        metadata.type,
        metadata.identitySource,
        rawValue,
      );

      const policy = AUTH_RATE_LIMIT_POLICIES[metadata.type];

      bucketInputs.push({
        key,
        limit: policy.maxRequests,
        windowSeconds: policy.windowSeconds,
      });
    }

    if (bucketInputs.length === 0) {
      return true;
    }

    const nowMilliseconds = Date.now();
    const result = await this.storage.consume(bucketInputs, nowMilliseconds);

    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new AuthRateLimitException(result.retryAfterSeconds);
    }

    return true;
  }

  private extractIdentity(
    source: RateLimitKeySource,
    request: Request,
  ): string | null {
    if (source === 'client-ip') {
      const ip = this.clientIpService.getClientIp(request);
      if (!ip) {
        throw new Error('Internal Error: Client IP not resolved');
      }
      return ip;
    }

    if (source === 'auth-email') {
      const body = request.body as Record<string, unknown> | undefined;
      const email = body?.email;
      if (typeof email === 'string' && email.trim() !== '') {
        if (email.length > 254) {
          return null; // Ignore if overly long email to prevent HMAC payload bloat
        }
        return normalizeAuthEmail(email);
      }
      return null;
    }

    if (source === 'authenticated-user') {
      const reqWithAuth = request as unknown as {
        auth?: { userId?: unknown };
      };
      const userId = reqWithAuth.auth?.userId;
      if (typeof userId === 'string' && userId.trim() !== '') {
        return userId;
      }
      throw new Error('Internal Error: Authenticated user context is missing');
    }

    return null;
  }
}
