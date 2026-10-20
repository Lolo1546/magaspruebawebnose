import { Injectable, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokenService } from '../crypto/token.service.js';
import { sessionConfig } from '../config/session.config.js';
import { Prisma } from '../../generated/prisma/client.js';
import * as net from 'net';
import {
  CreateSessionInput,
  CreatedSessionResult,
  ValidatedSession,
  SessionSummary,
  SessionAuditContext,
  TransactionClient,
} from './types/session.types.js';

function sanitizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  return net.isIP(ip) ? ip : null;
}

function sanitizeUserAgent(ua?: string | null): string | null {
  if (!ua) return null;
  return Array.from(ua).slice(0, 256).join('');
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    @Inject(sessionConfig.KEY)
    private readonly config: ConfigType<typeof sessionConfig>,
  ) {}

  private async runInTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    existingTx?: TransactionClient,
  ): Promise<T> {
    if (existingTx) {
      return fn(existingTx);
    }
    return this.prisma.$transaction(async (t) => fn(t));
  }

  async createSession(
    input: CreateSessionInput,
    tx?: TransactionClient,
  ): Promise<CreatedSessionResult> {
    const { raw: rawToken, hash: tokenHash } =
      this.tokenService.generateToken();

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.maxAgeDays * 24 * 60 * 60 * 1000,
    );
    const validIp = sanitizeIp(input.ipAddress);
    const validUa = sanitizeUserAgent(input.userAgentSummary);

    const client = tx ?? this.prisma;
    const session = await client.session.create({
      data: {
        userId: input.userId,
        tokenHash,
        ipAddress: validIp,
        userAgentSummary: validUa,
        createdAt: now,
        lastUsedAt: now,
        expiresAt,
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        ipAddress: true,
        userAgentSummary: true,
      },
    });

    return {
      sessionToken: rawToken,
      session,
    };
  }

  async validateSession(
    sessionToken: string,
    tx?: TransactionClient,
  ): Promise<ValidatedSession | null> {
    if (sessionToken.trim().length === 0) return null;

    const tokenHash = this.tokenService.hashToken(sessionToken);
    const now = new Date();
    const idleCutoff = new Date(
      now.getTime() - this.config.idleTimeoutDays * 24 * 60 * 60 * 1000,
    );

    const client = tx ?? this.prisma;
    const session = await client.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { status: true } },
      },
    });

    if (!session) return null;
    if (session.revokedAt !== null) return null;
    if (session.expiresAt <= now) return null;
    if (session.lastUsedAt <= idleCutoff) return null;

    if (
      session.user.status === 'SUSPENDED' ||
      session.user.status === 'PENDING_DELETION' ||
      session.user.status === 'DELETED'
    ) {
      return null;
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      userStatus: session.user.status,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
    };
  }

  async touchSession(
    sessionId: string,
    tx?: TransactionClient,
  ): Promise<boolean> {
    const now = new Date();
    const touchCutoff = new Date(
      now.getTime() - this.config.touchThrottleMinutes * 60 * 1000,
    );
    const client = tx ?? this.prisma;

    const result = await client.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: now },
        lastUsedAt: { lte: touchCutoff },
      },
      data: {
        lastUsedAt: now,
      },
    });

    return result.count > 0;
  }

  async revokeSession(
    sessionId: string,
    ownerUserId: string,
    context?: SessionAuditContext,
    tx?: TransactionClient,
  ): Promise<boolean> {
    return this.runInTransaction(async (t) => {
      const result = await t.session.updateMany({
        where: { id: sessionId, userId: ownerUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (result.count === 0) return false;

      const metadata: Prisma.InputJsonObject = {
        sessionId,
        ...(context?.reason ? { reason: context.reason } : {}),
      };

      await t.securityAuditEvent.create({
        data: {
          eventType: 'SESSION_REVOKED',
          userId: ownerUserId,
          ipAddress: sanitizeIp(context?.ipAddress),
          userAgentSummary: sanitizeUserAgent(context?.userAgentSummary),
          metadata,
        },
      });

      return true;
    }, tx);
  }

  async revokeAllSessions(
    userId: string,
    options?: {
      excludeSessionId?: string;
      reason?: SessionAuditContext['reason'];
      ipAddress?: string | null;
      userAgentSummary?: string | null;
    },
    tx?: TransactionClient,
  ): Promise<number> {
    return this.runInTransaction(async (t) => {
      const whereClause: Prisma.SessionWhereInput = {
        userId,
        revokedAt: null,
      };

      if (options?.excludeSessionId) {
        whereClause.id = { not: options.excludeSessionId };
      }

      const result = await t.session.updateMany({
        where: whereClause,
        data: { revokedAt: new Date() },
      });

      if (result.count > 0) {
        const metadata: Prisma.InputJsonObject = {
          ...(options?.reason ? { reason: options.reason } : {}),
          ...(options?.excludeSessionId
            ? { excludeSessionId: options.excludeSessionId }
            : {}),
        };

        await t.securityAuditEvent.create({
          data: {
            eventType: 'SESSION_REVOKED_ALL',
            userId,
            ipAddress: sanitizeIp(options?.ipAddress),
            userAgentSummary: sanitizeUserAgent(options?.userAgentSummary),
            metadata,
          },
        });
      }

      return result.count;
    }, tx);
  }

  async listUserSessions(
    userId: string,
    tx?: TransactionClient,
  ): Promise<SessionSummary[]> {
    const client = tx ?? this.prisma;
    const now = new Date();

    return client.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        ipAddress: true,
        userAgentSummary: true,
      },
    });
  }
}
