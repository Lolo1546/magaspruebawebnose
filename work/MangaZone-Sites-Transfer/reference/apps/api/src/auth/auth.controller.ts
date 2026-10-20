import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Inject,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  Get,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegistrationApplicationService } from './registration/registration-application.service.js';
import { EmailDeliveryError } from '../email/errors/email-delivery.error.js';
import { CsrfService } from '../security/csrf/csrf.service.js';
import { Public } from './decorators/public.decorator.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { clearSessionCookie, setSessionCookie } from './utils/cookie.util.js';
import { SessionGuard } from './guards/session.guard.js';
import { CurrentAuth } from './decorators/current-auth.decorator.js';
import { OptionalSessionGuard } from './guards/optional-session.guard.js';
import { ClientIpService } from '../security/client-ip/client-ip.service.js';
import { ConditionalCsrfGuard } from '../security/csrf/guards/conditional-csrf.guard.js';
import { AuthRateLimitGuard } from '../security/rate-limit/auth-rate-limit.guard.js';
import { AuthRateLimit } from '../security/rate-limit/auth-rate-limit.decorator.js';
import type { AuthenticatedRequestContext } from './types/authenticated-request-context.js';
import type { OptionalAuthenticatedRequest } from './types/optional-authenticated-request.js';
import cookieConfig from '../config/cookie.config.js';
import type { ConfigType } from '@nestjs/config';
import { EmailAlreadyExistsError } from './errors/email-already-exists.error.js';
import { UsernameAlreadyExistsError } from './errors/username-already-exists.error.js';
import { RegistrationValidationError } from './errors/registration-validation.error.js';
import { PasswordPolicyError } from '../crypto/errors/password-policy.error.js';
import { InvalidCredentialsError } from './errors/invalid-credentials.error.js';
import { ForgotPasswordDto } from './password-reset/dto/forgot-password.dto.js';
import { ResetPasswordDto } from './password-reset/dto/reset-password.dto.js';
import { PasswordResetService } from './password-reset/password-reset.service.js';
import { InvalidPasswordResetTokenError } from './password-reset/errors/invalid-password-reset-token.error.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationApplicationService: RegistrationApplicationService,
    private readonly csrfService: CsrfService,
    @Inject(cookieConfig.KEY)
    private readonly cookieConf: ConfigType<typeof cookieConfig>,
    private readonly clientIpService: ClientIpService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  private extractMetadata(req: Pick<Request, 'ip' | 'get'> & Partial<Request>) {
    const ipAddress = this.clientIpService.getClientIp(req as Request);
    const ua = req.get('user-agent');
    const userAgentSummary = ua ? Array.from(ua).slice(0, 256).join('') : null;

    return { ipAddress, userAgentSummary };
  }

  private mapError(error: unknown): never {
    if (
      error instanceof EmailAlreadyExistsError ||
      error instanceof UsernameAlreadyExistsError
    ) {
      throw new ConflictException(error.message);
    }
    if (
      error instanceof RegistrationValidationError ||
      error instanceof PasswordPolicyError
    ) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof InvalidCredentialsError) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    throw error;
  }

  @Get('session')
  @UseGuards(OriginGuard, SessionGuard)
  async getSession(@CurrentAuth() auth: AuthenticatedRequestContext) {
    const user = await this.authService.getMinimalUser(auth.userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const csrfToken = this.csrfService.generateToken(auth.sessionId);

    return {
      user,
      csrfToken,
    };
  }

  @Post('register')
  @Public()
  @UseGuards(OriginGuard, AuthRateLimitGuard)
  @AuthRateLimit({
    type: 'REGISTER_IP',
    identitySource: 'client-ip',
  })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Pick<Request, 'ip' | 'get'>,
    @Res({ passthrough: true }) res: Pick<Response, 'cookie'>,
  ) {
    const metadata = this.extractMetadata(req);

    try {
      const result = await this.registrationApplicationService.register({
        username: dto.username,
        email: dto.email,
        password: dto.password,
        ipAddress: metadata.ipAddress,
        userAgentSummary: metadata.userAgentSummary,
      });

      const isProduction = this.cookieConf.isProduction;

      setSessionCookie(
        res,
        this.cookieConf.name,
        result.sessionToken,
        isProduction,
        result.sessionExpiresAt,
      );

      const csrfToken = this.csrfService.generateToken(result.sessionId);

      return {
        user: {
          id: result.userId,
          status: result.userStatus,
        },
        session: {
          createdAt: result.sessionCreatedAt,
          expiresAt: result.sessionExpiresAt,
        },
        csrfToken,
      };
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'EMAIL_DELIVERY_UNAVAILABLE',
          message:
            'La cuenta fue creada, pero no pudimos enviar el correo de verificación. Inicia sesión y solicita un nuevo envío.',
        });
      }
      this.mapError(error);
    }
  }

  @Post('login')
  @Public()
  @UseGuards(OriginGuard, AuthRateLimitGuard)
  @AuthRateLimit(
    {
      type: 'LOGIN_IP',
      identitySource: 'client-ip',
    },
    {
      type: 'LOGIN_AUTH_EMAIL',
      identitySource: 'auth-email',
    },
  )
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Pick<Request, 'ip' | 'get'>,
    @Res({ passthrough: true }) res: Pick<Response, 'cookie'>,
  ) {
    const metadata = this.extractMetadata(req);

    try {
      const result = await this.authService.login({
        email: dto.email,
        password: dto.password,
        ipAddress: metadata.ipAddress,
        userAgentSummary: metadata.userAgentSummary,
      });

      const isProduction = this.cookieConf.isProduction;

      setSessionCookie(
        res,
        this.cookieConf.name,
        result.sessionToken,
        isProduction,
        result.sessionExpiresAt,
      );

      const csrfToken = this.csrfService.generateToken(result.sessionId);

      return {
        user: {
          id: result.userId,
          status: result.userStatus,
        },
        session: {
          createdAt: result.sessionCreatedAt,
          expiresAt: result.sessionExpiresAt,
        },
        csrfToken,
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  @Post('logout')
  @UseGuards(OriginGuard, OptionalSessionGuard, ConditionalCsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: OptionalAuthenticatedRequest,
    @Res({ passthrough: true }) res: Pick<Response, 'clearCookie'>,
  ) {
    if (!req.auth) {
      clearSessionCookie(
        res,
        this.cookieConf.name,
        this.cookieConf.isProduction,
      );
      return;
    }

    const metadata = this.extractMetadata(req);
    await this.authService.logout(
      req.auth.sessionId,
      req.auth.userId,
      metadata,
    );
    clearSessionCookie(res, this.cookieConf.name, this.cookieConf.isProduction);
  }

  @Post('logout-all')
  @UseGuards(OriginGuard, OptionalSessionGuard, ConditionalCsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() req: OptionalAuthenticatedRequest,
    @Res({ passthrough: true }) res: Pick<Response, 'clearCookie'>,
  ) {
    if (!req.auth) {
      clearSessionCookie(
        res,
        this.cookieConf.name,
        this.cookieConf.isProduction,
      );
      return;
    }

    const metadata = this.extractMetadata(req);
    await this.authService.logoutAll(req.auth.userId, metadata);
    clearSessionCookie(res, this.cookieConf.name, this.cookieConf.isProduction);
  }

  @Post('forgot-password')
  @Public()
  @UseGuards(OriginGuard, AuthRateLimitGuard)
  @AuthRateLimit(
    {
      type: 'FORGOT_PASSWORD_IP',
      identitySource: 'client-ip',
    },
    {
      type: 'FORGOT_PASSWORD_AUTH_EMAIL',
      identitySource: 'auth-email',
    },
  )
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Pick<Request, 'ip' | 'get'>,
  ) {
    const metadata = this.extractMetadata(req);

    await this.passwordResetService.requestPasswordReset({
      email: dto.email,
      ipAddress: metadata.ipAddress,
      userAgentSummary: metadata.userAgentSummary,
    });

    return { accepted: true };
  }

  @Post('reset-password')
  @Public()
  @UseGuards(OriginGuard, AuthRateLimitGuard)
  @AuthRateLimit({
    type: 'RESET_PASSWORD_IP',
    identitySource: 'client-ip',
  })
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Pick<Request, 'ip' | 'get'>,
  ) {
    const metadata = this.extractMetadata(req);

    try {
      await this.passwordResetService.completePasswordReset({
        token: dto.token,
        newPassword: dto.newPassword,
        ipAddress: metadata.ipAddress,
        userAgentSummary: metadata.userAgentSummary,
      });
    } catch (error) {
      if (error instanceof InvalidPasswordResetTokenError) {
        throw new BadRequestException(
          'El enlace de recuperación es inválido o ha expirado.',
        );
      }
      if (error instanceof PasswordPolicyError) {
        throw new BadRequestException(error.message);
      }
      this.mapError(error);
    }

    return { completed: true };
  }
}
