-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "userAgentSummary" VARCHAR(256),
    "ipAddress" VARCHAR(45),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "invalidatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditEvent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "eventType" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgentSummary" VARCHAR(256),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "SecurityAuditEvent_userId_createdAt_idx" ON "SecurityAuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditEvent_eventType_createdAt_idx" ON "SecurityAuditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditEvent_createdAt_idx" ON "SecurityAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditEvent" ADD CONSTRAINT "SecurityAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint (Session)
ALTER TABLE "Session" ADD CONSTRAINT "Session_expiresAt_after_createdAt_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_revokedAt_after_createdAt_check" CHECK ("revokedAt" IS NULL OR "revokedAt" >= "createdAt");

-- CheckConstraint (EmailVerificationToken)
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_expiresAt_after_createdAt_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_consumedAt_after_createdAt_check" CHECK ("consumedAt" IS NULL OR "consumedAt" >= "createdAt");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_invalidatedAt_after_createdAt_check" CHECK ("invalidatedAt" IS NULL OR "invalidatedAt" >= "createdAt");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_mutual_exclusion_check" CHECK (NOT ("consumedAt" IS NOT NULL AND "invalidatedAt" IS NOT NULL));

-- CheckConstraint (PasswordResetToken)
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_expiresAt_after_createdAt_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_consumedAt_after_createdAt_check" CHECK ("consumedAt" IS NULL OR "consumedAt" >= "createdAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_invalidatedAt_after_createdAt_check" CHECK ("invalidatedAt" IS NULL OR "invalidatedAt" >= "createdAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_mutual_exclusion_check" CHECK (NOT ("consumedAt" IS NOT NULL AND "invalidatedAt" IS NOT NULL));
