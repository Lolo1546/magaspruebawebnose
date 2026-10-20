import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import httpConfig from '../../../config/http.config';
import { OriginValidator } from '../origin.validator';
import { Request } from 'express';

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly logger = new Logger(OriginGuard.name);

  constructor(
    private readonly originValidator: OriginValidator,
    @Inject(httpConfig.KEY)
    private readonly httpConf: ConfigType<typeof httpConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    const result = this.originValidator.validate({
      method,
      originHeader: request.headers.origin,
      refererHeader: request.headers.referer,
      allowedOrigins: this.httpConf.corsAllowedOrigins,
    });

    if (result.allowed) {
      return true;
    }

    this.logger.warn(`Origin validation failed: ${result.reason}`);

    throw new ForbiddenException({
      statusCode: 403,
      code: 'CSRF_VALIDATION_FAILED',
      message: 'Solicitud no permitida.',
    });
  }
}
