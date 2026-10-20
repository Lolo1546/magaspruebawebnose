import { Injectable } from '@nestjs/common';
import * as net from 'net';
import { Prisma, UserStatus } from '../../../generated/prisma/client.js';
import { PasswordService } from '../../crypto/password.service.js';
import { TokenService } from '../../crypto/token.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionService } from '../../session/session.service.js';
import { normalizeAuthEmail } from '../identity/auth-identity-normalizer.js';
import { InvalidPasswordResetTokenError } from './errors/invalid-password-reset-token.error.js';
import type {
  CompletePasswordResetInput,
  CompletePasswordResetResult,
  IssuePasswordResetInput,
  PasswordResetDelivery,
  PasswordResetIssuedPersistence,
  RequestPasswordResetInput,
  RequestPasswordResetResult,
} from './password-reset.types.js';

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

type PasswordResetCandidate = {
  id: string;
  email: string | null;
  passwordHash: string | null;
  status: UserStatus;
};

function sanitizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  return net.isIP(ip) ? ip : null;
}

function sanitizeUserAgent(userAgent?: string | null): string | null {
  return userAgent ? Array.from(userAgent).slice(0, 256).join('') : null;
}

function isValidResetTokenFormat(token: string): boolean {
  return PASSWORD_RESET_TOKEN_PATTERN.test(token);
}

function isSerializableTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  private isEligibleCandidate(
    user: PasswordResetCandidate | null,
  ): user is PasswordResetCandidate & { email: string; passwordHash: string } {
    return Boolean(
      user &&
      user.email &&
      user.email.trim() !== '' &&
      user.passwordHash &&
      (user.status === UserStatus.ACTIVE ||
        user.status === UserStatus.PENDING_VERIFICATION ||
        user.status === UserStatus.SUSPENDED),
    );
  }

  private async runSerializableTransactionWithRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (
      let attempt = 1;
      attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          !isSerializableTransactionConflict(error) ||
          attempt === SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS
        ) {
          throw error;
        }
      }
    }

    throw new Error('Unreachable serializable transaction state.');
  }

  async requestPasswordReset(
    input: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResult> {
    const emailNormalized = normalizeAuthEmail(input.email);
    const acceptedAt = new Date();
    await this.prisma.passwordResetRequestJob.create({
      data: {
        requestedEmail: emailNormalized,
        ipAddress: sanitizeIp(input.ipAddress),
        userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
        availableAt: acceptedAt,
        createdAt: acceptedAt,
      },
    });

    return { accepted: true };
  }

  async issuePasswordResetForJob(
    input: IssuePasswordResetInput,
    persistIssuedDelivery: PasswordResetIssuedPersistence,
  ): Promise<PasswordResetDelivery | null> {
    const emailNormalized = normalizeAuthEmail(input.email);
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!this.isEligibleCandidate(user)) {
      return null;
    }

    const { raw, hash } = this.tokenService.generateToken(
      PASSWORD_RESET_TOKEN_BYTES,
    );
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + PASSWORD_RESET_TOKEN_EXPIRY_MS,
    );

    const delivery = await this.runSerializableTransactionWithRetry(
      async (tx): Promise<PasswordResetDelivery> => {
        const transactionNow = new Date();

        await tx.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            consumedAt: null,
            invalidatedAt: null,
            expiresAt: { gt: transactionNow },
          },
          data: { invalidatedAt: transactionNow },
        });

        const createdToken = await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hash,
            expiresAt,
          },
          select: { id: true, expiresAt: true },
        });

        await tx.securityAuditEvent.create({
          data: {
            eventType: 'PASSWORD_RESET_REQUESTED',
            userId: user.id,
            ipAddress: sanitizeIp(input.ipAddress),
            userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
            metadata: Prisma.DbNull,
          },
        });

        const delivery: PasswordResetDelivery = {
          email: emailNormalized,
          token: raw,
          expiresAt: createdToken.expiresAt,
          passwordResetTokenId: createdToken.id,
        };
        await persistIssuedDelivery(tx, delivery);
        return delivery;
      },
    );
    return delivery;
  }

  async completePasswordReset(
    input: CompletePasswordResetInput,
  ): Promise<CompletePasswordResetResult> {
    if (!isValidResetTokenFormat(input.token)) {
      throw new InvalidPasswordResetTokenError();
    }

    const tokenHash = this.tokenService.hashToken(input.token);
    const lookupTime = new Date();
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        consumedAt: true,
        invalidatedAt: true,
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.consumedAt !== null ||
      tokenRecord.invalidatedAt !== null ||
      tokenRecord.expiresAt <= lookupTime
    ) {
      throw new InvalidPasswordResetTokenError();
    }

    const passwordHash = await this.passwordService.hash(input.newPassword);
    const completedAt = new Date();

    return this.prisma.$transaction<CompletePasswordResetResult>(async (tx) => {
      const tokenUpdate = await tx.passwordResetToken.updateMany({
        where: {
          id: tokenRecord.id,
          userId: tokenRecord.userId,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: completedAt },
        },
        data: { consumedAt: completedAt },
      });

      if (tokenUpdate.count !== 1) {
        throw new InvalidPasswordResetTokenError();
      }

      const userUpdate = await tx.user.updateMany({
        where: {
          id: tokenRecord.userId,
          passwordHash: { not: null },
          status: {
            notIn: [UserStatus.PENDING_DELETION, UserStatus.DELETED],
          },
        },
        data: { passwordHash },
      });

      if (userUpdate.count !== 1) {
        throw new InvalidPasswordResetTokenError();
      }

      await this.sessionService.revokeAllSessions(
        tokenRecord.userId,
        {
          reason: 'PASSWORD_RESET',
          ipAddress: input.ipAddress,
          userAgentSummary: input.userAgentSummary,
        },
        tx,
      );

      await tx.securityAuditEvent.create({
        data: {
          eventType: 'PASSWORD_RESET_COMPLETED',
          userId: tokenRecord.userId,
          ipAddress: sanitizeIp(input.ipAddress),
          userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
          metadata: Prisma.DbNull,
        },
      });

      return { completed: true };
    });
  }
}
