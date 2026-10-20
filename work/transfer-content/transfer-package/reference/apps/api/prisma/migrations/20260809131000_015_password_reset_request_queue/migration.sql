-- CreateEnum
CREATE TYPE "PasswordResetRequestJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "PasswordResetRequestJob" (
    "id" UUID NOT NULL,
    "requestedEmail" VARCHAR(254),
    "ipAddress" VARCHAR(45),
    "userAgentSummary" VARCHAR(256),
    "status" "PasswordResetRequestJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "lockExpiresAt" TIMESTAMPTZ(3),
    "lockToken" UUID,
    "passwordResetTokenId" UUID,
    "deliveryTokenCiphertext" TEXT,
    "deliveryExpiresAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(64),
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PasswordResetRequestJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequestJob_passwordResetTokenId_key" ON "PasswordResetRequestJob"("passwordResetTokenId");

-- CreateIndex
CREATE INDEX "PasswordResetRequestJob_status_availableAt_createdAt_idx" ON "PasswordResetRequestJob"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequestJob_lockExpiresAt_idx" ON "PasswordResetRequestJob"("lockExpiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequestJob_processedAt_idx" ON "PasswordResetRequestJob"("processedAt");

-- AddForeignKey
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_passwordResetTokenId_fkey" FOREIGN KEY ("passwordResetTokenId") REFERENCES "PasswordResetToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_attempts_nonnegative_check" CHECK ("attempts" >= 0);
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_availableAt_after_createdAt_check" CHECK ("availableAt" >= "createdAt");
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_lock_window_check" CHECK ("lockedAt" IS NULL OR ("lockExpiresAt" IS NOT NULL AND "lockExpiresAt" > "lockedAt"));
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_lock_state_check" CHECK (
    ("status" = 'PROCESSING' AND "lockedAt" IS NOT NULL AND "lockExpiresAt" IS NOT NULL AND "lockToken" IS NOT NULL)
    OR
    ("status" <> 'PROCESSING' AND "lockedAt" IS NULL AND "lockExpiresAt" IS NULL AND "lockToken" IS NULL)
);
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_terminal_state_check" CHECK (
    ("status" IN ('COMPLETED', 'FAILED') AND "processedAt" IS NOT NULL AND "requestedEmail" IS NULL AND "ipAddress" IS NULL AND "userAgentSummary" IS NULL AND "deliveryTokenCiphertext" IS NULL)
    OR
    ("status" IN ('PENDING', 'PROCESSING') AND "processedAt" IS NULL AND "requestedEmail" IS NOT NULL)
);
ALTER TABLE "PasswordResetRequestJob" ADD CONSTRAINT "PasswordResetRequestJob_delivery_state_check" CHECK (
    ("passwordResetTokenId" IS NULL AND "deliveryTokenCiphertext" IS NULL AND "deliveryExpiresAt" IS NULL)
    OR
    ("passwordResetTokenId" IS NOT NULL AND "deliveryTokenCiphertext" IS NOT NULL AND "deliveryExpiresAt" IS NOT NULL)
    OR
    ("status" IN ('COMPLETED', 'FAILED') AND "deliveryTokenCiphertext" IS NULL AND "deliveryExpiresAt" IS NULL)
);
