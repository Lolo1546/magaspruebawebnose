import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service.js';
import { ResendVerificationApplicationService } from './resend-verification-application.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { OriginGuard } from '../../security/csrf/guards/origin.guard.js';
import { SessionGuard } from '../guards/session.guard.js';
import { CsrfGuard } from '../../security/csrf/guards/csrf.guard.js';
import { Public } from '../decorators/public.decorator.js';
import { CurrentAuth } from '../decorators/current-auth.decorator.js';
import { InvalidEmailVerificationTokenError } from './errors/invalid-email-verification-token.error.js';
import { EmailDeliveryError } from '../../email/errors/email-delivery.error.js';
import type { AuthenticatedRequestContext } from '../types/authenticated-request-context.js';
import type { Request } from 'express';
import { ClientIpService } from '../../security/client-ip/client-ip.service.js';
import { AuthRateLimitGuard } from '../../security/rate-limit/auth-rate-limit.guard.js';
import { AuthRateLimit } from '../../security/rate-limit/auth-rate-limit.decorator.js';
@Controller('auth')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
    private readonly resendVerificationApplicationService: ResendVerificationApplicationService,
    private readonly clientIpService: ClientIpService,
  ) {}

  @Post('verify-email')
  @Public()
  @UseGuards(OriginGuard, AuthRateLimitGuard)
  @AuthRateLimit({
    type: 'VERIFY_EMAIL_IP',
    identitySource: 'client-ip',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Pick<Request, 'ip' | 'get'> & Partial<Request>,
    @Headers('user-agent') rawUserAgent?: string | string[],
  ): Promise<void> {
    let userAgentSummary: string | null = null;

    if (typeof rawUserAgent === 'string') {
      userAgentSummary = Array.from(rawUserAgent).slice(0, 256).join('');
    } else if (Array.isArray(rawUserAgent) && rawUserAgent.length > 0) {
      userAgentSummary = Array.from(rawUserAgent[0]).slice(0, 256).join('');
    }

    try {
      await this.emailVerificationService.verifyEmail(dto.token, {
        ipAddress: this.clientIpService.getClientIp(req as Request),
        userAgentSummary,
      });
    } catch (error) {
      if (error instanceof InvalidEmailVerificationTokenError) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'EMAIL_VERIFICATION_TOKEN_INVALID',
          message: 'El enlace de verificación no es válido o ha expirado.',
        });
      }
      throw error;
    }
  }

  @Post('resend-verification')
  @UseGuards(OriginGuard, SessionGuard, CsrfGuard, AuthRateLimitGuard)
  @AuthRateLimit({
    type: 'RESEND_VERIFICATION_USER',
    identitySource: 'authenticated-user',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Req() req: Pick<Request, 'ip' | 'get'> & Partial<Request>,
    @Headers('user-agent') rawUserAgent?: string | string[],
  ): Promise<void> {
    let userAgentSummary: string | null = null;

    if (typeof rawUserAgent === 'string') {
      userAgentSummary = Array.from(rawUserAgent).slice(0, 256).join('');
    } else if (Array.isArray(rawUserAgent) && rawUserAgent.length > 0) {
      userAgentSummary = Array.from(rawUserAgent[0]).slice(0, 256).join('');
    }

    try {
      await this.resendVerificationApplicationService.resend({
        userId: auth.userId,
        ipAddress: this.clientIpService.getClientIp(req as Request),
        userAgentSummary,
      });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'EMAIL_DELIVERY_UNAVAILABLE',
          message:
            'No pudimos enviar el correo de verificación. Inténtalo nuevamente más tarde.',
        });
      }
      throw error;
    }
  }
}
