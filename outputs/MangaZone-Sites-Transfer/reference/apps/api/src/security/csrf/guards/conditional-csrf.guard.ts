import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { CsrfService } from '../csrf.service.js';
import type { OptionalAuthenticatedRequest } from '../../../auth/types/optional-authenticated-request.js';

@Injectable()
export class ConditionalCsrfGuard implements CanActivate {
  constructor(private readonly csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<OptionalAuthenticatedRequest>();

    if (!request.auth) {
      return true;
    }

    const tokenHeader = request.headers['x-csrf-token'];

    if (tokenHeader === undefined) {
      this.reject();
    }

    if (Array.isArray(tokenHeader)) {
      this.reject();
    }

    if (typeof tokenHeader !== 'string' || tokenHeader.trim().length === 0) {
      this.reject();
    }

    if (tokenHeader.length > 512) {
      this.reject();
    }

    const isValid = this.csrfService.verifyToken(
      tokenHeader,
      request.auth.sessionId,
    );

    if (!isValid) {
      this.reject();
    }

    return true;
  }

  private reject(): never {
    throw new ForbiddenException({
      statusCode: 403,
      code: 'CSRF_VALIDATION_FAILED',
      message: 'Solicitud no permitida.',
    });
  }
}
