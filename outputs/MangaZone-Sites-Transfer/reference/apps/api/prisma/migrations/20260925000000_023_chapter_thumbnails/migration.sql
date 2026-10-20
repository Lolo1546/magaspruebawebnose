BEGIN;

ALTER TYPE "EditorialUploadPurpose" ADD VALUE 'CHAPTER_THUMBNAIL';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'CHAPTER_THUMBNAIL_SET';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'CHAPTER_THUMBNAIL_REQUESTED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'CHAPTER_THUMBNAIL_APPROVED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'CHAPTER_THUMBNAIL_REJECTED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'CHAPTER_THUMBNAIL_OVERRIDDEN';
CREATE TYPE "ChapterThumbnailRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

ALTER TABLE "Chapter"
    ADD COLUMN "thumbnailAssetId" UUID,
    ADD COLUMN "thumbnailActorUserId" UUID,
    ADD COLUMN "thumbnailGroupId" UUID,
    ADD COLUMN "thumbnailSetAt" TIMESTAMPTZ(3),
    ADD CONSTRAINT "Chapter_thumbnail_shape" CHECK (
        ("thumbnailAssetId" IS NULL AND "thumbnailActorUserId" IS NULL AND "thumbnailGroupId" IS NULL AND "thumbnailSetAt" IS NULL)
        OR ("thumbnailAssetId" IS NOT NULL AND "thumbnailActorUserId" IS NOT NULL AND "thumbnailSetAt" IS NOT NULL)
    );

CREATE TABLE "ChapterThumbnailRequest" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "proposedAssetId" UUID NOT NULL,
    "status" "ChapterThumbnailRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolverUserId" UUID,
    CONSTRAINT "ChapterThumbnailRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChapterThumbnailRequest_resolution" CHECK (
        ("status" = 'PENDING' AND "resolvedAt" IS NULL AND "resolverUserId" IS NULL)
        OR ("status" <> 'PENDING' AND "resolvedAt" IS NOT NULL AND "resolverUserId" IS NOT NULL AND "resolvedAt" >= "createdAt")
    )
);
CREATE UNIQUE INDEX "ChapterThumbnailRequest_pending_key"
ON "ChapterThumbnailRequest" ("chapterId", "groupId") WHERE "status" = 'PENDING';
CREATE INDEX "ChapterThumbnailRequest_chapterId_status_createdAt_id_idx"
ON "ChapterThumbnailRequest" ("chapterId", "status", "createdAt", "id");

ALTER TABLE "EditorialUploadIntent"
    ADD COLUMN "chapterId" UUID,
    ADD COLUMN "thumbnailGroupId" UUID,
    DROP CONSTRAINT "EditorialUploadIntent_context",
    ADD CONSTRAINT "EditorialUploadIntent_context" CHECK (
        ("purpose"::text = 'CHAPTER_THUMBNAIL' AND "chapterId" IS NOT NULL AND "mangaId" IS NULL AND "releaseId" IS NULL)
        OR ("chapterId" IS NULL AND "thumbnailGroupId" IS NULL AND (
            ("purpose"::text = 'MANGA_PAGE' AND "releaseId" IS NOT NULL AND "mangaId" IS NULL)
            OR ("purpose"::text = 'MANGA_COVER' AND "mangaId" IS NOT NULL AND "releaseId" IS NULL)
        ))
    );
CREATE INDEX "EditorialUploadIntent_chapterId_idx" ON "EditorialUploadIntent" ("chapterId");

ALTER TABLE "EditorialAuditEvent"
    ADD COLUMN "chapterId" UUID,
    ADD COLUMN "thumbnailRequestId" UUID,
    ADD COLUMN "previousAssetId" UUID,
    ADD COLUMN "proposedAssetId" UUID,
    DROP CONSTRAINT "EditorialAuditEvent_resource_shape",
    ADD CONSTRAINT "EditorialAuditEvent_resource_shape" CHECK (
      ("chapterId" IS NULL AND "thumbnailRequestId" IS NULL AND "previousAssetId" IS NULL AND "proposedAssetId" IS NULL AND (
(
            "releaseId" IS NULL AND (
                (
                    "actionType"::text IN ('PROJECT_CREATED', 'PROJECT_GROUP_ADDED', 'PROJECT_GROUP_REMOVED')
                    AND "projectId" IS NOT NULL AND "groupId" IS NOT NULL AND "mangaId" IS NULL
                    AND "reason" IS NULL AND "fromVersion" IS NULL AND "toVersion" IS NULL
                )
                OR (
                    "actionType"::text = 'MANGA_CREATED'
                    AND "projectId" IS NULL AND "groupId" IS NULL AND "mangaId" IS NOT NULL
                    AND "fromVersion" IS NULL AND "toVersion" = 1
                )
                OR (
                    "actionType"::text IN ('MANGA_UPDATED', 'MANGA_PUBLISHED', 'MANGA_HIDDEN')
                    AND "projectId" IS NULL AND "groupId" IS NULL AND "mangaId" IS NOT NULL
                    AND "fromVersion" IS NOT NULL AND "toVersion" = "fromVersion" + 1
                    AND ("actionType"::text <> 'MANGA_HIDDEN' OR "reason" IS NOT NULL)
                )
            )
        )
        OR (
            "actionType"::text IN ('RELEASE_PUBLISHED', 'RELEASE_WITHDRAWN')
            AND "releaseId" IS NOT NULL AND "projectId" IS NULL AND "groupId" IS NULL AND "mangaId" IS NULL
            AND "reason" IS NULL
            AND "fromVersion" IS NOT NULL AND "fromVersion" > 0
            AND "toVersion" IS NOT NULL AND "toVersion" = "fromVersion" + 1
        )
      ))
      OR (
        "chapterId" IS NOT NULL AND "proposedAssetId" IS NOT NULL
        AND "projectId" IS NULL AND "mangaId" IS NULL AND "releaseId" IS NULL
        AND "reason" IS NULL AND "fromVersion" IS NULL AND "toVersion" IS NULL
        AND (
          ("actionType"::text IN ('CHAPTER_THUMBNAIL_SET', 'CHAPTER_THUMBNAIL_OVERRIDDEN') AND "thumbnailRequestId" IS NULL)
          OR ("actionType"::text IN ('CHAPTER_THUMBNAIL_REQUESTED', 'CHAPTER_THUMBNAIL_APPROVED', 'CHAPTER_THUMBNAIL_REJECTED')
              AND "thumbnailRequestId" IS NOT NULL AND "groupId" IS NOT NULL)
        )
      )
    );
CREATE INDEX "EditorialAuditEvent_chapterId_createdAt_id_idx"
ON "EditorialAuditEvent" ("chapterId", "createdAt", "id");

ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_thumbnailAssetId_fkey"
FOREIGN KEY ("thumbnailAssetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_thumbnailActorUserId_fkey"
FOREIGN KEY ("thumbnailActorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_thumbnailGroupId_fkey"
FOREIGN KEY ("thumbnailGroupId") REFERENCES "ScanlationGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChapterThumbnailRequest" ADD CONSTRAINT "ChapterThumbnailRequest_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChapterThumbnailRequest" ADD CONSTRAINT "ChapterThumbnailRequest_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChapterThumbnailRequest" ADD CONSTRAINT "ChapterThumbnailRequest_requesterUserId_fkey"
FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChapterThumbnailRequest" ADD CONSTRAINT "ChapterThumbnailRequest_resolverUserId_fkey"
FOREIGN KEY ("resolverUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChapterThumbnailRequest" ADD CONSTRAINT "ChapterThumbnailRequest_proposedAssetId_fkey"
FOREIGN KEY ("proposedAssetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EditorialUploadIntent" ADD CONSTRAINT "EditorialUploadIntent_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EditorialUploadIntent" ADD CONSTRAINT "EditorialUploadIntent_thumbnailGroupId_fkey"
FOREIGN KEY ("thumbnailGroupId") REFERENCES "ScanlationGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_thumbnailRequestId_fkey"
FOREIGN KEY ("thumbnailRequestId") REFERENCES "ChapterThumbnailRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_previousAssetId_fkey"
FOREIGN KEY ("previousAssetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_proposedAssetId_fkey"
FOREIGN KEY ("proposedAssetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
