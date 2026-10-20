-- CreateEnum
CREATE TYPE "ChapterContributionType" AS ENUM ('TRANSLATOR', 'CLEANER', 'REDRAWER', 'TYPESETTER', 'PROOFREADER', 'UPLOADER', 'OTHER');

-- AlterTable
ALTER TABLE "ChapterRelease" ADD COLUMN     "projectId" UUID;

-- CreateTable
CREATE TABLE "ChapterReleaseGroup" (
    "chapterReleaseId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterReleaseGroup_pkey" PRIMARY KEY ("chapterReleaseId","groupId")
);

-- CreateTable
CREATE TABLE "ChapterCredit" (
    "id" UUID NOT NULL,
    "chapterReleaseId" UUID NOT NULL,
    "userId" UUID,
    "groupId" UUID,
    "contributionType" "ChapterContributionType" NOT NULL,
    "displayNameSnapshot" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterCredit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChapterCredit_identity_required_check" CHECK (
        "userId" IS NOT NULL
        OR "groupId" IS NOT NULL
        OR "displayNameSnapshot" IS NOT NULL
    ),
    CONSTRAINT "ChapterCredit_snapshot_not_blank_check" CHECK (
        "displayNameSnapshot" IS NULL OR BTRIM("displayNameSnapshot") <> ''
    )
);

-- CreateIndex
CREATE INDEX "ChapterReleaseGroup_groupId_idx" ON "ChapterReleaseGroup"("groupId");

-- CreateIndex
CREATE INDEX "ChapterCredit_chapterReleaseId_idx" ON "ChapterCredit"("chapterReleaseId");

-- CreateIndex
CREATE INDEX "ChapterCredit_userId_idx" ON "ChapterCredit"("userId");

-- CreateIndex
CREATE INDEX "ChapterCredit_groupId_idx" ON "ChapterCredit"("groupId");

-- Prevent exact duplicate credits for each supported identity shape while handling NULL correctly.
CREATE UNIQUE INDEX "ChapterCredit_release_user_group_type_key"
ON "ChapterCredit"("chapterReleaseId", "userId", "groupId", "contributionType")
WHERE "userId" IS NOT NULL AND "groupId" IS NOT NULL;

CREATE UNIQUE INDEX "ChapterCredit_release_user_type_without_group_key"
ON "ChapterCredit"("chapterReleaseId", "userId", "contributionType")
WHERE "userId" IS NOT NULL AND "groupId" IS NULL;

CREATE UNIQUE INDEX "ChapterCredit_release_group_type_without_user_key"
ON "ChapterCredit"("chapterReleaseId", "groupId", "contributionType")
WHERE "userId" IS NULL AND "groupId" IS NOT NULL;

CREATE UNIQUE INDEX "ChapterCredit_release_snapshot_type_key"
ON "ChapterCredit"("chapterReleaseId", "displayNameSnapshot", "contributionType")
WHERE "userId" IS NULL AND "groupId" IS NULL;

-- CreateIndex
CREATE INDEX "ChapterRelease_projectId_status_publishedAt_idx" ON "ChapterRelease"("projectId", "status", "publishedAt");

-- AddForeignKey
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScanlationProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterReleaseGroup" ADD CONSTRAINT "ChapterReleaseGroup_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterReleaseGroup" ADD CONSTRAINT "ChapterReleaseGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCredit" ADD CONSTRAINT "ChapterCredit_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCredit" ADD CONSTRAINT "ChapterCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCredit" ADD CONSTRAINT "ChapterCredit_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
