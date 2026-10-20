import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from '../../crypto/token.service.js';
import type { VerificationDelivery } from '../../email/ports/email-verification-sender.port.js';
import { Prisma } from '../../../generated/prisma/client.js';

function sanitizeIp(ip: string | null): string | null {
  if (!ip) return null;
  return String(ip).substring(0, 45);
}

function sanitizeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  return Array.from(userAgent).slice(0, 256).join('');
}

@Injectable()
export class ResendVerificationService {
  private static readonly TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async issueReplacementToken(input: {
    userId: string;
    ipAddress: string | null;
    userAgentSummary: string | null;
  }): Promise<VerificationDelivery | null> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, status: true },
      });

      if (!user || user.status !== 'PENDING_VERIFICATION' || !user.email) {
        return null;
      }

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + ResendVerificationService.TOKEN_EXPIRY_MS,
      );
      const { raw, hash } = this.tokenService.generateToken();

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          invalidatedAt: null,
        },
        data: {
          invalidatedAt: now,
        },
      });

      const createdToken = await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt,
        },
      });

      await tx.securityAuditEvent.create({
        data: {
          eventType: 'EMAIL_VERIFICATION_REISSUED',
          userId: user.id,
          ipAddress: sanitizeIp(input.ipAddress),
          userAgentSummary: sanitizeUserAgent(input.userAgentSummary),
          metadata: Prisma.DbNull,
        },
      });

      return {
        email: user.email,
        token: raw,
        expiresAt: createdToken.expiresAt,
        verificationTokenId: createdToken.id,
      };
    });
  }
}
