import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import httpConfig from '../../../config/http.config.js';
import { CsrfService } from '../csrf.service.js';
import { OriginValidator } from '../origin.validator.js';
import { AuthenticatedRequest } from '../../../auth/types/authenticated-request.js';
import { CsrfFailureReason } from '../types/csrf.types.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

  constructor(
    private readonly originValidator: OriginValidator,
    private readonly csrfService: CsrfService,
    @Inject(httpConfig.KEY)
    private readonly hConfig: ConfigType<typeof httpConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method.toUpperCase();

    // 1. Métodos seguros
    if (this.SAFE_METHODS.has(method)) {
      return true;
    }

    // 2. Validación de Origen
    const originValidation = this.originValidator.validate({
      method,
      originHeader: request.headers['origin'],
      refererHeader: request.headers['referer'],
      allowedOrigins: this.hConfig.corsAllowedOrigins,
    });

    if (!originValidation.allowed) {
      this.reject(originValidation.reason);
    }

    // 3. Contexto Autenticado
    if (!request.auth) {
      this.reject('AUTH_CONTEXT_MISSING');
    }

    // 4. Leer Header X-CSRF-Token
    const tokenHeader = request.headers['x-csrf-token'];

    if (tokenHeader === undefined) {
      this.reject('TOKEN_MISSING');
    }

    if (Array.isArray(tokenHeader)) {
      this.reject('TOKEN_MULTIPLE');
    }

    if (typeof tokenHeader !== 'string' || tokenHeader.trim().length === 0) {
      this.reject('TOKEN_MALFORMED');
    }

    if (tokenHeader.length > 512) {
      this.reject('TOKEN_TOO_LONG');
    }

    // 5. Verificar firma criptográfica
    const isValid = this.csrfService.verifyToken(
      tokenHeader,
      request.auth.sessionId,
    );

    if (!isValid) {
      this.reject('TOKEN_INVALID');
    }

    return true;
  }

  private reject(reason?: CsrfFailureReason): never {
    if (reason === 'AUTH_CONTEXT_MISSING') {
      this.logger.warn(reason);
    }
    // Para otros errores, no generamos log o usamos debug, tal cual recomendado.

    throw new ForbiddenException({
      statusCode: 403,
      code: 'CSRF_VALIDATION_FAILED',
      message: 'Solicitud no permitida.',
    });
  }
}
