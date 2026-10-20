-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('MANGA', 'SOCIAL', 'COMMUNITY', 'GROUP', 'MODERATION', 'SYSTEM');

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actorUserId" UUID,
    "type" VARCHAR(120) NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "payloadVersion" SMALLINT NOT NULL DEFAULT 1,
    "payload" JSONB,
    "mangaId" UUID,
    "postId" UUID,
    "postCommentId" UUID,
    "reviewId" UUID,
    "communityId" UUID,
    "scanlationGroupId" UUID,
    "scanlationProjectId" UUID,
    "chapterReleaseId" UUID,
    "reportId" UUID,
    "userSanctionId" UUID,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_type_not_blank_check"
CHECK (length(btrim("type")) > 0);

-- CheckConstraint
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_payload_version_positive_check"
CHECK ("payloadVersion" >= 1);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_category_createdAt_idx" ON "Notification"("userId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postCommentId_fkey" FOREIGN KEY ("postCommentId") REFERENCES "PostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_scanlationGroupId_fkey" FOREIGN KEY ("scanlationGroupId") REFERENCES "ScanlationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_scanlationProjectId_fkey" FOREIGN KEY ("scanlationProjectId") REFERENCES "ScanlationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userSanctionId_fkey" FOREIGN KEY ("userSanctionId") REFERENCES "UserSanction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
