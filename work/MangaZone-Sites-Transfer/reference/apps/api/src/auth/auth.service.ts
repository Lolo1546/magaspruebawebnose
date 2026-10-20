import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../crypto/password.service.js';
import { TokenService } from '../crypto/token.service.js';
import { SessionService } from '../session/session.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  RegisterInput,
  LoginInput,
  AuthResult,
  RegistrationResult,
} from './types/auth.types.js';
import { InvalidCredentialsError } from './errors/invalid-credentials.error.js';
import { EmailAlreadyExistsError } from './errors/email-already-exists.error.js';
import { UsernameAlreadyExistsError } from './errors/username-already-exists.error.js';
import { RegistrationValidationError } from './errors/registration-validation.error.js';
import { InvalidStoredPasswordHashError } from '../crypto/errors/invalid-password-hash.error.js';
import {
  normalizeAuthEmail,
  normalizeAuthUsername,
} from './identity/auth-identity-normalizer.js';
import type { SessionUserDto } from './dto/session-response.dto.js';

function validateEmailFormat(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  const atIndex = trimmed.indexOf('@');
  if (atIndex < 1 || atIndex === trimmed.length - 1) return false;
  if (trimmed.indexOf('@', atIndex + 1) !== -1) return false;
  const domain = trimmed.slice(atIndex + 1);
  if (!domain.includes('.')) return false;
  return true;
}

function validateUsernameFormat(username: string): boolean {
  const trimmed = username.trim();
  const length = Array.from(trimmed).length;
  if (length < 3 || length > 30) return false;
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._-])*[a-zA-Z0-9]$/.test(trimmed))
    return false;
  if (/[._-]{2,}/.test(trimmed)) return false;
  return true;
}

function sanitizeIp(ip?: string | null): string | null {
  return ip ? ip.substring(0, 45) : null;
}

function sanitizeUserAgent(ua?: string | null): string | null {
  return ua ? ua.substring(0, 256) : null;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private static readonly EMAIL_VERIFICATION_TOKEN_EXPIRY_MS =
    24 * 60 * 60 * 1000;
  private static readonly DUMMY_PASSWORD = 'anti-enumeration-dummy-pw';
  private dummyHash!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.passwordService.hash(
      AuthService.DUMMY_PASSWORD,
    );
  }

  async getMinimalUser(userId: string): Promise<SessionUserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarAsset: {
              select: {
                storageKey: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName ?? null,
      avatarUrl: user.profile?.avatarAsset?.storageKey
        ? `/assets/${user.profile.avatarAsset.storageKey}` // Basic assumption, but usually URL requires full path or S3.
        : null,
    };
  }

  async register(input: RegisterInput): Promise<RegistrationResult> {
    const usernameTrimmed = input.username.trim();
    const emailTrimmed = input.email.trim();

    if (!validateUsernameFormat(usernameTrimmed)) {
      throw new RegistrationValidationError(
        'Formato de nombre de usuario inválido.',
      );
    }
    if (!validateEmailFormat(emailTrimmed)) {
      throw new RegistrationValidationError(
        'Formato de correo electrónico inválido.',
      );
    }

    const emailNormalized = normalizeAuthEmail(emailTrimmed);
    const usernameNormalized = normalizeAuthUsername(usernameTrimmed);

    const passwordHash = await this.passwordService.hash(input.password);
    const { raw: rawVerificationToken, hash: emailTokenHash } =
      this.tokenService.generateToken();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: usernameTrimmed,
            usernameNormalized,
            email: emailTrimmed,
            emailNormalized,
            passwordHash,
            status: 'PENDING_VERIFICATION',
          },
          select: { id: true, status: true },
        });

        await tx.profile.create({
          data: {
            userId: user.id,
            displayName: usernameTrimmed,
          },
        });

        await tx.emailVerificationToken.updateMany({
          where: { userId: user.id, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: new Date() },
        });

        const verificationToken = await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: emailTokenHash,
            expiresAt: new Date(
              Date.now() + AuthService.EMAIL_VERIFICATION_TOKEN_EXPIRY_MS,
            ),
          },
        });

        const sessionResult = await this.sessionService.createSession(
          {
            userId: user.id,
            ipAddress: input.ipAddress,
            userAgentSummary: input.userAgentSummary,
          },
          tx,
        );

        await tx.securityAuditEvent.create({
          data: {
            eventType: 'REGISTRATION',
            userId: user.id,
            ipAddress: sanitizeIp(input.ipAddress),
            userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
            metadata: Prisma.DbNull,
          },
        });

        await tx.securityAuditEvent.create({
          data: {
            eventType: 'EMAIL_VERIFICATION_ISSUED',
            userId: user.id,
            ipAddress: sanitizeIp(input.ipAddress),
            userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
            metadata: Prisma.DbNull,
          },
        });

        return {
          auth: {
            userId: user.id,
            userStatus: user.status,
            sessionToken: sessionResult.sessionToken,
            sessionId: sessionResult.session.id,
            sessionCreatedAt: sessionResult.session.createdAt,
            sessionExpiresAt: sessionResult.session.expiresAt,
          },
          verificationDelivery: {
            email: emailTrimmed,
            token: rawVerificationToken,
            expiresAt: verificationToken.expiresAt,
            verificationTokenId: verificationToken.id,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const fields = Array.isArray(target)
          ? target
          : typeof target === 'string'
            ? [target]
            : [];
        if (fields.includes('emailNormalized'))
          throw new EmailAlreadyExistsError();
        if (fields.includes('usernameNormalized'))
          throw new UsernameAlreadyExistsError();
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const emailNormalized = normalizeAuthEmail(input.email);

    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
      select: { id: true, passwordHash: true, status: true },
    });

    const hashToVerify = user?.passwordHash ?? this.dummyHash;
    let isValid = false;
    try {
      isValid = await this.passwordService.verify(hashToVerify, input.password);
    } catch (error) {
      if (error instanceof InvalidStoredPasswordHashError) {
        isValid = false;
      } else {
        throw error;
      }
    }

    if (
      !user ||
      !isValid ||
      user.status === 'SUSPENDED' ||
      user.status === 'PENDING_DELETION' ||
      user.status === 'DELETED'
    ) {
      try {
        await this.prisma.securityAuditEvent.create({
          data: {
            eventType: 'LOGIN_FAILED',
            userId: user?.id ?? null,
            ipAddress: sanitizeIp(input.ipAddress),
            userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
            metadata: Prisma.DbNull,
          },
        });
      } catch {
        // Ignorar fallo de inserción de LOGIN_FAILED, seguir propagando error.
      }
      throw new InvalidCredentialsError();
    }

    // Calcular el nuevo hash fuera de la transacción si es necesario.
    let newHash: string | null = null;
    if (
      user.passwordHash &&
      this.passwordService.needsRehash(user.passwordHash)
    ) {
      try {
        newHash = await this.passwordService.hash(input.password);
      } catch {
        // Fallo en hash best-effort se ignora
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      if (newHash) {
        try {
          await tx.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          });
        } catch {
          // Ignorar fallo en la actualización del passwordHash (best effort).
        }
      }

      const sessionResult = await this.sessionService.createSession(
        {
          userId: user.id,
          ipAddress: input.ipAddress,
          userAgentSummary: input.userAgentSummary,
        },
        tx,
      );

      await tx.securityAuditEvent.create({
        data: {
          eventType: 'LOGIN_SUCCESS',
          userId: user.id,
          ipAddress: sanitizeIp(input.ipAddress),
          userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
          metadata: Prisma.DbNull,
        },
      });

      return {
        userId: user.id,
        userStatus: user.status,
        sessionToken: sessionResult.sessionToken,
        sessionId: sessionResult.session.id,
        sessionCreatedAt: sessionResult.session.createdAt,
        sessionExpiresAt: sessionResult.session.expiresAt,
      };
    });
  }

  async logout(
    sessionId: string,
    userId: string,
    context?: { ipAddress?: string | null; userAgentSummary?: string | null },
  ): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      const revoked = await this.sessionService.revokeSession(
        sessionId,
        userId,
        { reason: 'USER_LOGOUT', ...context },
        tx,
      );

      if (revoked) {
        await tx.securityAuditEvent.create({
          data: {
            eventType: 'LOGOUT',
            userId,
            ipAddress: sanitizeIp(context?.ipAddress),
            userAgentSummary: sanitizeUserAgent(context?.userAgentSummary),
            metadata: { sessionId },
          },
        });
        return true;
      }
      return false;
    });
  }

  async logoutAll(
    userId: string,
    options?: {
      excludeSessionId?: string;
      ipAddress?: string | null;
      userAgentSummary?: string | null;
    },
  ): Promise<number> {
    return await this.prisma.$transaction(async (tx) => {
      const count = await this.sessionService.revokeAllSessions(
        userId,
        {
          excludeSessionId: options?.excludeSessionId,
          reason: 'GLOBAL_LOGOUT',
          ipAddress: options?.ipAddress,
          userAgentSummary: options?.userAgentSummary,
        },
        tx,
      );

      if (count > 0) {
        await tx.securityAuditEvent.create({
          data: {
            eventType: 'LOGOUT_ALL',
            userId,
            ipAddress: sanitizeIp(options?.ipAddress),
            userAgentSummary: sanitizeUserAgent(options?.userAgentSummary),
            metadata: options?.excludeSessionId
              ? {
                  excludeSessionId: options.excludeSessionId,
                }
              : Prisma.DbNull,
          },
        });
      }
      return count;
    });
  }
}
