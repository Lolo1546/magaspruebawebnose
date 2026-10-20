import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { SessionService } from '../../session/session.service.js';
import cookieConfig from '../../config/cookie.config.js';
import { OptionalAuthenticatedRequest } from '../types/optional-authenticated-request.js';

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    @Inject(cookieConfig.KEY)
    private readonly cConfig: ConfigType<typeof cookieConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<OptionalAuthenticatedRequest>();

    if (!request.cookies) {
      return true;
    }

    const cookiesObj = request.cookies as Record<string, unknown>;
    const rawToken = cookiesObj[this.cConfig.name];

    if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      return true;
    }

    const validatedSession =
      await this.sessionService.validateSession(rawToken);

    if (!validatedSession) {
      return true;
    }

    request.auth = {
      userId: validatedSession.userId,
      userStatus: validatedSession.userStatus,
      sessionId: validatedSession.sessionId,
      createdAt: validatedSession.createdAt,
      expiresAt: validatedSession.expiresAt,
    };

    return true;
  }
}
