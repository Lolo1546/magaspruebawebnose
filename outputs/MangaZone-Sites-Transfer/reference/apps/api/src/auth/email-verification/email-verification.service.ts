import { Injectable } from '@nestjs/common';
import { UserStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from '../../crypto/token.service.js';
import { InvalidEmailVerificationTokenError } from './errors/invalid-email-verification-token.error.js';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async verifyEmail(
    token: string,
    context: {
      ipAddress: string | null;
      userAgentSummary: string | null;
    },
  ): Promise<void> {
    const tokenHash = this.tokenService.hashToken(token);

    // Lectura mínima: requerida para obtener IDs y estructurar la actualización atómica
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true },
    });

    if (!tokenRecord) {
      throw new InvalidEmailVerificationTokenError();
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Paso 1: consumo condicional del token
      const tokenUpdate = await tx.emailVerificationToken.updateMany({
        where: {
          id: tokenRecord.id,
          userId: tokenRecord.userId,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          consumedAt: now,
        },
      });

      // Paso 2: transición condicional del usuario
      const userUpdate = await tx.user.updateMany({
        where: {
          id: tokenRecord.userId,
          status: UserStatus.PENDING_VERIFICATION,
        },
        data: {
          status: UserStatus.ACTIVE,
        },
      });

      // Si cualquiera falla, la transacción retrocede íntegramente
      if (tokenUpdate.count !== 1 || userUpdate.count !== 1) {
        throw new InvalidEmailVerificationTokenError();
      }

      // Paso 3: invalidar tokens restantes
      await tx.emailVerificationToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          id: {
            not: tokenRecord.id,
          },
          consumedAt: null,
          invalidatedAt: null,
        },
        data: {
          invalidatedAt: now,
        },
      });

      // Paso 4: auditoría real (campos reales, sin inventar)
      await tx.securityAuditEvent.create({
        data: {
          eventType: 'EMAIL_VERIFIED',
          userId: tokenRecord.userId,
          ipAddress: context.ipAddress,
          userAgentSummary: context.userAgentSummary,
        },
      });
    });
  }
}
