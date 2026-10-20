import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PasswordResetRequestJobStatus,
  Prisma,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PASSWORD_RESET_SENDER,
  type PasswordResetSender,
} from '../../email/ports/password-reset-sender.port.js';
import { EmailDeliveryError } from '../../email/errors/email-delivery.error.js';
import { PasswordResetService } from './password-reset.service.js';
import { PasswordResetDeliveryCipherService } from './password-reset-delivery-cipher.service.js';
import type { PasswordResetDelivery } from './password-reset.types.js';

const MAX_JOB_ATTEMPTS = 5;
const CLAIM_LEASE_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const TERMINAL_RETENTION_MS = 24 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
] as const;

type ClaimedPasswordResetJob = {
  id: string;
  requestedEmail: string;
  ipAddress: string | null;
  userAgentSummary: string | null;
  attempts: number;
  lockToken: string;
  passwordResetTokenId: string | null;
  deliveryTokenCiphertext: string | null;
  deliveryExpiresAt: Date | null;
};

function isRetryableJobError(error: unknown): boolean {
  if (error instanceof EmailDeliveryError) return error.isRetryable;
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

function sanitizeOperationalErrorCode(error: unknown): string {
  let code = 'UNEXPECTED_ERROR';
  if (error instanceof EmailDeliveryError) {
    code = error.providerCode ?? `EMAIL_${error.category}`;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    code = error.code;
  }
  const sanitized = code.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 64);
  return sanitized || 'UNEXPECTED_ERROR';
}

@Injectable()
export class PasswordResetRequestWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PasswordResetRequestWorker.name);
  private stopped = true;
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private nextPurgeAt = new Date(0);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordResetService: PasswordResetService,
    private readonly deliveryCipher: PasswordResetDeliveryCipherService,
    @Inject(PASSWORD_RESET_SENDER)
    private readonly passwordResetSender: PasswordResetSender,
  ) {}

  onApplicationBootstrap(): void {
    this.stopped = false;
    this.schedule(0);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.inFlight;
  }

  async processNextJob(now = new Date()): Promise<boolean> {
    await this.finalizeExpiredExhaustedClaims(now);
    const job = await this.claimNextJob(now);
    if (!job) return false;

    let delivery: PasswordResetDelivery | null;
    try {
      delivery = await this.resolveDelivery(job);
    } catch (error) {
      await this.handleProcessingFailure(job, error, new Date());
      return true;
    }

    if (!delivery) {
      await this.markCompleted(job, new Date());
      return true;
    }

    if (delivery.expiresAt <= new Date()) {
      await this.markFailed(job, 'DELIVERY_TOKEN_EXPIRED', new Date());
      return true;
    }

    try {
      await this.passwordResetSender.sendPasswordResetEmail(delivery);
    } catch (error) {
      await this.handleProcessingFailure(job, error, new Date());
      return true;
    }

    await this.markCompleted(job, new Date());
    return true;
  }

  async purgeRetainedTerminalJobs(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - TERMINAL_RETENTION_MS);
    const result = await this.prisma.passwordResetRequestJob.deleteMany({
      where: {
        status: {
          in: [
            PasswordResetRequestJobStatus.COMPLETED,
            PasswordResetRequestJobStatus.FAILED,
          ],
        },
        processedAt: { lte: cutoff },
      },
    });
    return result.count;
  }

  private schedule(delayMilliseconds: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const run = this.drainQueue();
      this.inFlight = run;
      void run.finally(() => {
        if (this.inFlight === run) this.inFlight = null;
        this.schedule(POLL_INTERVAL_MS);
      });
    }, delayMilliseconds);
    this.timer.unref();
  }

  private async drainQueue(): Promise<void> {
    try {
      const now = new Date();
      if (now >= this.nextPurgeAt) {
        await this.purgeRetainedTerminalJobs(now);
        this.nextPurgeAt = new Date(now.getTime() + PURGE_INTERVAL_MS);
      }
      while (!this.stopped && (await this.processNextJob())) {
        // Drain all currently available jobs before returning to polling.
      }
    } catch {
      this.logger.warn('PASSWORD_RESET_JOB_LOOP_FAILED');
    }
  }

  private async claimNextJob(
    now: Date,
  ): Promise<ClaimedPasswordResetJob | null> {
    const lockToken = crypto.randomUUID();
    const lockExpiresAt = new Date(now.getTime() + CLAIM_LEASE_MS);
    const jobs = await this.prisma.$queryRaw<ClaimedPasswordResetJob[]>(
      Prisma.sql`
        WITH candidate AS (
          SELECT "id"
          FROM "PasswordResetRequestJob"
          WHERE (
            (
              "status" = 'PENDING'::"PasswordResetRequestJobStatus"
              AND "availableAt" <= ${now}
              AND "attempts" < ${MAX_JOB_ATTEMPTS}
            )
            OR
            (
              "status" = 'PROCESSING'::"PasswordResetRequestJobStatus"
              AND "lockExpiresAt" <= ${now}
              AND "attempts" < ${MAX_JOB_ATTEMPTS}
            )
          )
          ORDER BY "availableAt" ASC, "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "PasswordResetRequestJob" AS job
        SET
          "status" = 'PROCESSING'::"PasswordResetRequestJobStatus",
          "attempts" = job."attempts" + 1,
          "lockedAt" = ${now},
          "lockExpiresAt" = ${lockExpiresAt},
          "lockToken" = ${lockToken}::uuid,
          "updatedAt" = ${now}
        FROM candidate
        WHERE job."id" = candidate."id"
        RETURNING
          job."id",
          job."requestedEmail",
          job."ipAddress",
          job."userAgentSummary",
          job."attempts",
          job."lockToken",
          job."passwordResetTokenId",
          job."deliveryTokenCiphertext",
          job."deliveryExpiresAt"
      `,
    );
    return jobs[0] ?? null;
  }

  private async resolveDelivery(
    job: ClaimedPasswordResetJob,
  ): Promise<PasswordResetDelivery | null> {
    if (
      job.passwordResetTokenId &&
      job.deliveryTokenCiphertext &&
      job.deliveryExpiresAt
    ) {
      return {
        email: job.requestedEmail,
        token: this.deliveryCipher.decrypt(job.deliveryTokenCiphertext, {
          jobId: job.id,
          passwordResetTokenId: job.passwordResetTokenId,
        }),
        expiresAt: job.deliveryExpiresAt,
        passwordResetTokenId: job.passwordResetTokenId,
      };
    }

    return this.passwordResetService.issuePasswordResetForJob(
      {
        email: job.requestedEmail,
        ipAddress: job.ipAddress,
        userAgentSummary: job.userAgentSummary,
      },
      async (tx, delivery) => {
        const persistenceAt = new Date();
        const result = await tx.passwordResetRequestJob.updateMany({
          where: {
            id: job.id,
            status: PasswordResetRequestJobStatus.PROCESSING,
            lockToken: job.lockToken,
            lockExpiresAt: { gt: persistenceAt },
            passwordResetTokenId: null,
          },
          data: {
            passwordResetTokenId: delivery.passwordResetTokenId,
            deliveryTokenCiphertext: this.deliveryCipher.encrypt(
              delivery.token,
              {
                jobId: job.id,
                passwordResetTokenId: delivery.passwordResetTokenId,
              },
            ),
            deliveryExpiresAt: delivery.expiresAt,
          },
        });
        if (result.count !== 1) {
          throw new Error('Password reset job claim was lost.');
        }
      },
    );
  }

  private async handleProcessingFailure(
    job: ClaimedPasswordResetJob,
    error: unknown,
    failedAt: Date,
  ): Promise<void> {
    const errorCode = sanitizeOperationalErrorCode(error);
    if (isRetryableJobError(error) && job.attempts < MAX_JOB_ATTEMPTS) {
      const delayIndex = Math.min(job.attempts - 1, RETRY_DELAYS_MS.length - 1);
      const delay = RETRY_DELAYS_MS[delayIndex] ?? RETRY_DELAYS_MS[0];
      const result = await this.prisma.passwordResetRequestJob.updateMany({
        where: {
          id: job.id,
          status: PasswordResetRequestJobStatus.PROCESSING,
          lockToken: job.lockToken,
          lockExpiresAt: { gt: failedAt },
        },
        data: {
          status: PasswordResetRequestJobStatus.PENDING,
          availableAt: new Date(failedAt.getTime() + delay),
          lockedAt: null,
          lockExpiresAt: null,
          lockToken: null,
          lastErrorCode: errorCode,
        },
      });
      if (result.count !== 1) {
        throw new Error('Password reset job claim was lost.');
      }
      return;
    }
    await this.markFailed(job, errorCode, failedAt);
  }

  private async markCompleted(
    job: ClaimedPasswordResetJob,
    completedAt: Date,
  ): Promise<void> {
    const result = await this.prisma.passwordResetRequestJob.updateMany({
      where: {
        id: job.id,
        status: PasswordResetRequestJobStatus.PROCESSING,
        lockToken: job.lockToken,
        lockExpiresAt: { gt: completedAt },
      },
      data: {
        status: PasswordResetRequestJobStatus.COMPLETED,
        requestedEmail: null,
        ipAddress: null,
        userAgentSummary: null,
        deliveryTokenCiphertext: null,
        deliveryExpiresAt: null,
        lastErrorCode: null,
        processedAt: completedAt,
        lockedAt: null,
        lockExpiresAt: null,
        lockToken: null,
      },
    });
    if (result.count !== 1) {
      throw new Error('Password reset job claim was lost.');
    }
  }

  private async markFailed(
    job: ClaimedPasswordResetJob,
    errorCode: string,
    failedAt: Date,
  ): Promise<void> {
    const result = await this.prisma.passwordResetRequestJob.updateMany({
      where: {
        id: job.id,
        status: PasswordResetRequestJobStatus.PROCESSING,
        lockToken: job.lockToken,
        lockExpiresAt: { gt: failedAt },
      },
      data: {
        status: PasswordResetRequestJobStatus.FAILED,
        requestedEmail: null,
        ipAddress: null,
        userAgentSummary: null,
        deliveryTokenCiphertext: null,
        deliveryExpiresAt: null,
        lastErrorCode: errorCode,
        processedAt: failedAt,
        lockedAt: null,
        lockExpiresAt: null,
        lockToken: null,
      },
    });
    if (result.count !== 1) {
      throw new Error('Password reset job claim was lost.');
    }
  }

  private async finalizeExpiredExhaustedClaims(now: Date): Promise<void> {
    await this.prisma.passwordResetRequestJob.updateMany({
      where: {
        status: PasswordResetRequestJobStatus.PROCESSING,
        attempts: { gte: MAX_JOB_ATTEMPTS },
        lockExpiresAt: { lte: now },
      },
      data: {
        status: PasswordResetRequestJobStatus.FAILED,
        requestedEmail: null,
        ipAddress: null,
        userAgentSummary: null,
        deliveryTokenCiphertext: null,
        deliveryExpiresAt: null,
        lastErrorCode: 'ATTEMPTS_EXHAUSTED',
        processedAt: now,
        lockedAt: null,
        lockExpiresAt: null,
        lockToken: null,
      },
    });
  }
}
