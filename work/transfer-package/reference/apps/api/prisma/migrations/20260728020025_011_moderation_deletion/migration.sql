-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE', 'SEXUAL_CONTENT', 'VIOLENCE', 'SPOILER', 'IMPERSONATION', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('HIDE_CONTENT', 'RESTORE_CONTENT', 'REMOVE_CONTENT', 'WARN_USER', 'RESTRICT_USER', 'SUSPEND_USER', 'BAN_USER', 'UNBAN_USER', 'APPROVE_REQUEST', 'REJECT_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('USER', 'POST', 'POST_COMMENT', 'REVIEW', 'COMMUNITY', 'SCANLATION_GROUP', 'PROJECT', 'CHAPTER_RELEASE');

-- CreateEnum
CREATE TYPE "UserSanctionType" AS ENUM ('WARNING', 'RESTRICTION', 'SUSPENSION', 'BAN');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccountDeletionRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentDeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterUserId" UUID,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reportedUserId" UUID,
    "postId" UUID,
    "postCommentId" UUID,
    "reviewId" UUID,
    "scanlationGroupId" UUID,
    "communityId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedByUserId" UUID,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" UUID NOT NULL,
    "moderatorUserId" UUID,
    "reportId" UUID,
    "actionType" "ModerationActionType" NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSanction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "UserSanctionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "issuedByUserId" UUID,
    "startsAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "revokedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSanction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userSanctionId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerUserId" UUID,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "AccountDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMPTZ(3) NOT NULL,
    "cancelledAt" TIMESTAMPTZ(3),
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDeletionRequest" (
    "id" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ContentDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "postId" UUID,
    "postCommentId" UUID,
    "reviewId" UUID,
    "reviewerUserId" UUID,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContentDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint
ALTER TABLE "Report"
ADD CONSTRAINT "Report_exactly_one_target_check"
CHECK (num_nonnulls("reportedUserId", "postId", "postCommentId", "reviewId", "scanlationGroupId", "communityId") = 1);

-- CheckConstraint
ALTER TABLE "Report"
ADD CONSTRAINT "Report_terminal_status_reviewed_check"
CHECK ("status" NOT IN ('RESOLVED', 'REJECTED') OR "reviewedAt" IS NOT NULL);

-- CheckConstraint
ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_reason_not_blank_check"
CHECK (length(btrim("reason")) > 0);

-- CheckConstraint
ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_snapshot_object_check"
CHECK ("snapshot" IS NULL OR jsonb_typeof("snapshot") = 'object');

-- CheckConstraint
ALTER TABLE "UserSanction"
ADD CONSTRAINT "UserSanction_reason_not_blank_check"
CHECK (length(btrim("reason")) > 0);

-- CheckConstraint
ALTER TABLE "UserSanction"
ADD CONSTRAINT "UserSanction_dates_check"
CHECK (("endsAt" IS NULL OR "endsAt" >= "startsAt") AND ("revokedAt" IS NULL OR "revokedAt" >= "startsAt"));

-- CheckConstraint
ALTER TABLE "UserSanction"
ADD CONSTRAINT "UserSanction_revoker_requires_revoked_at_check"
CHECK ("revokedByUserId" IS NULL OR "revokedAt" IS NOT NULL);

-- CheckConstraint
ALTER TABLE "Appeal"
ADD CONSTRAINT "Appeal_reason_not_blank_check"
CHECK (length(btrim("reason")) > 0);

-- CheckConstraint
ALTER TABLE "Appeal"
ADD CONSTRAINT "Appeal_terminal_status_reviewed_check"
CHECK ("status" = 'PENDING' OR "reviewedAt" IS NOT NULL);

-- CheckConstraint
ALTER TABLE "AccountDeletionRequest"
ADD CONSTRAINT "AccountDeletionRequest_schedule_check"
CHECK ("scheduledFor" >= "requestedAt");

-- CheckConstraint
ALTER TABLE "AccountDeletionRequest"
ADD CONSTRAINT "AccountDeletionRequest_cancelled_at_check"
CHECK ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL);

-- CheckConstraint
ALTER TABLE "AccountDeletionRequest"
ADD CONSTRAINT "AccountDeletionRequest_processed_at_check"
CHECK ("status" <> 'COMPLETED' OR "processedAt" IS NOT NULL);

-- CheckConstraint
ALTER TABLE "ContentDeletionRequest"
ADD CONSTRAINT "ContentDeletionRequest_exactly_one_target_check"
CHECK (num_nonnulls("postId", "postCommentId", "reviewId") = 1);

-- CheckConstraint
ALTER TABLE "ContentDeletionRequest"
ADD CONSTRAINT "ContentDeletionRequest_reason_not_blank_check"
CHECK (length(btrim("reason")) > 0);

-- CheckConstraint
ALTER TABLE "ContentDeletionRequest"
ADD CONSTRAINT "ContentDeletionRequest_terminal_status_reviewed_check"
CHECK ("status" NOT IN ('APPROVED', 'REJECTED') OR "reviewedAt" IS NOT NULL);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterUserId_idx" ON "Report"("reporterUserId");

-- CreateIndex
CREATE INDEX "Report_reviewedByUserId_idx" ON "Report"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_postId_idx" ON "Report"("postId");

-- CreateIndex
CREATE INDEX "Report_postCommentId_idx" ON "Report"("postCommentId");

-- CreateIndex
CREATE INDEX "Report_reviewId_idx" ON "Report"("reviewId");

-- CreateIndex
CREATE INDEX "Report_scanlationGroupId_idx" ON "Report"("scanlationGroupId");

-- CreateIndex
CREATE INDEX "Report_communityId_idx" ON "Report"("communityId");

-- CreateIndex
CREATE INDEX "ModerationAction_moderatorUserId_createdAt_idx" ON "ModerationAction"("moderatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_reportId_idx" ON "ModerationAction"("reportId");

-- CreateIndex
CREATE INDEX "ModerationAction_targetType_targetId_createdAt_idx" ON "ModerationAction"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_createdAt_idx" ON "ModerationAction"("createdAt");

-- CreateIndex
CREATE INDEX "UserSanction_userId_createdAt_idx" ON "UserSanction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSanction_userId_type_idx" ON "UserSanction"("userId", "type");

-- CreateIndex
CREATE INDEX "UserSanction_userId_revokedAt_endsAt_idx" ON "UserSanction"("userId", "revokedAt", "endsAt");

-- CreateIndex
CREATE INDEX "UserSanction_issuedByUserId_idx" ON "UserSanction"("issuedByUserId");

-- CreateIndex
CREATE INDEX "UserSanction_revokedByUserId_idx" ON "UserSanction"("revokedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSanction_userId_id_key" ON "UserSanction"("userId", "id");

-- CreateIndex
CREATE INDEX "Appeal_userId_createdAt_idx" ON "Appeal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Appeal_userSanctionId_createdAt_idx" ON "Appeal"("userSanctionId", "createdAt");

-- CreateIndex
CREATE INDEX "Appeal_status_createdAt_idx" ON "Appeal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Appeal_reviewerUserId_idx" ON "Appeal"("reviewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_one_pending_per_sanction_key"
ON "Appeal"("userSanctionId")
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_userId_createdAt_idx" ON "AccountDeletionRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_status_scheduledFor_idx" ON "AccountDeletionRequest"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "AccountDeletionRequest_one_active_per_user_key"
ON "AccountDeletionRequest"("userId")
WHERE "status" IN ('PENDING', 'PROCESSING');

-- CreateIndex
CREATE INDEX "ContentDeletionRequest_requesterUserId_createdAt_idx" ON "ContentDeletionRequest"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDeletionRequest_status_createdAt_idx" ON "ContentDeletionRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDeletionRequest_reviewerUserId_idx" ON "ContentDeletionRequest"("reviewerUserId");

-- CreateIndex
CREATE INDEX "ContentDeletionRequest_postId_idx" ON "ContentDeletionRequest"("postId");

-- CreateIndex
CREATE INDEX "ContentDeletionRequest_postCommentId_idx" ON "ContentDeletionRequest"("postCommentId");

-- CreateIndex
CREATE INDEX "ContentDeletionRequest_reviewId_idx" ON "ContentDeletionRequest"("reviewId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postCommentId_fkey" FOREIGN KEY ("postCommentId") REFERENCES "PostComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_scanlationGroupId_fkey" FOREIGN KEY ("scanlationGroupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_userSanctionId_fkey" FOREIGN KEY ("userId", "userSanctionId") REFERENCES "UserSanction"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDeletionRequest" ADD CONSTRAINT "ContentDeletionRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDeletionRequest" ADD CONSTRAINT "ContentDeletionRequest_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDeletionRequest" ADD CONSTRAINT "ContentDeletionRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDeletionRequest" ADD CONSTRAINT "ContentDeletionRequest_postCommentId_fkey" FOREIGN KEY ("postCommentId") REFERENCES "PostComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDeletionRequest" ADD CONSTRAINT "ContentDeletionRequest_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
