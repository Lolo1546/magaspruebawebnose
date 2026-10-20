import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ConfigType } from '@nestjs/config';
import { AUTH_CONSTANTS } from '../constants/auth.constants.js';
import { SessionService } from '../../session/session.service.js';
import cookieConfig from '../../config/cookie.config.js';
import { AuthenticatedRequest } from '../types/authenticated-request.js';
import { AuthenticatedRequestContext } from '../types/authenticated-request-context.js';

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    @Inject(cookieConfig.KEY)
    private readonly cConfig: ConfigType<typeof cookieConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_CONSTANTS.IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.cookies) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Autenticación requerida.',
      });
    }

    const cookiesObj = request.cookies as Record<string, unknown>;
    const rawToken = cookiesObj[this.cConfig.name];

    if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Autenticación requerida.',
      });
    }

    const validatedSession =
      await this.sessionService.validateSession(rawToken);

    if (!validatedSession) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Autenticación requerida.',
      });
    }

    const authContext: AuthenticatedRequestContext = {
      userId: validatedSession.userId,
      userStatus: validatedSession.userStatus,
      sessionId: validatedSession.sessionId,
      createdAt: validatedSession.createdAt,
      expiresAt: validatedSession.expiresAt,
    };

    request.auth = authContext;

    try {
      await this.sessionService.touchSession(validatedSession.sessionId);
    } catch {
      this.logger.warn('SESSION_TOUCH_FAILED');
    }

    return true;
  }
}
