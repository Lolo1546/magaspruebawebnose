BEGIN;

ALTER TYPE "EditorialAuditActionType" ADD VALUE 'RELEASE_PUBLISHED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'RELEASE_WITHDRAWN';

ALTER TABLE "EditorialAuditEvent"
    ADD COLUMN "releaseId" UUID,
    ADD CONSTRAINT "EditorialAuditEvent_releaseId_fkey"
        FOREIGN KEY ("releaseId") REFERENCES "ChapterRelease"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "EditorialAuditEvent_releaseId_createdAt_id_idx"
ON "EditorialAuditEvent"("releaseId", "createdAt", "id");

ALTER TABLE "EditorialAuditEvent"
    DROP CONSTRAINT "EditorialAuditEvent_resource_shape",
    ADD CONSTRAINT "EditorialAuditEvent_resource_shape" CHECK (
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
    );

COMMIT;
