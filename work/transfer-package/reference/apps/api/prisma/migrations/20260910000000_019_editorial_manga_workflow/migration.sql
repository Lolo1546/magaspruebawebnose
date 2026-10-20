BEGIN;

ALTER TYPE "EditorialAuditActionType" ADD VALUE 'MANGA_CREATED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'MANGA_UPDATED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'MANGA_PUBLISHED';
ALTER TYPE "EditorialAuditActionType" ADD VALUE 'MANGA_HIDDEN';

ALTER TABLE "EditorialAuditEvent"
    ALTER COLUMN "projectId" DROP NOT NULL,
    ALTER COLUMN "groupId" DROP NOT NULL,
    ADD COLUMN "mangaId" UUID,
    ADD COLUMN "reason" VARCHAR(2000),
    ADD COLUMN "fromVersion" INTEGER,
    ADD COLUMN "toVersion" INTEGER;

CREATE INDEX "EditorialAuditEvent_mangaId_createdAt_id_idx"
ON "EditorialAuditEvent"("mangaId", "createdAt", "id");

ALTER TABLE "EditorialAuditEvent"
    ADD CONSTRAINT "EditorialAuditEvent_mangaId_fkey"
        FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "EditorialAuditEvent_reason_valid" CHECK (
        "reason" IS NULL OR (char_length("reason") BETWEEN 1 AND 2000 AND btrim("reason") <> '')
    ),
    ADD CONSTRAINT "EditorialAuditEvent_resource_shape" CHECK (
        (
            "actionType"::text IN ('PROJECT_CREATED', 'PROJECT_GROUP_ADDED', 'PROJECT_GROUP_REMOVED')
            AND "projectId" IS NOT NULL
            AND "groupId" IS NOT NULL
            AND "mangaId" IS NULL
            AND "reason" IS NULL
            AND "fromVersion" IS NULL
            AND "toVersion" IS NULL
        )
        OR
        (
            "actionType"::text = 'MANGA_CREATED'
            AND "projectId" IS NULL
            AND "groupId" IS NULL
            AND "mangaId" IS NOT NULL
            AND "fromVersion" IS NULL
            AND "toVersion" = 1
        )
        OR
        (
            "actionType"::text IN ('MANGA_UPDATED', 'MANGA_PUBLISHED', 'MANGA_HIDDEN')
            AND "projectId" IS NULL
            AND "groupId" IS NULL
            AND "mangaId" IS NOT NULL
            AND "fromVersion" IS NOT NULL
            AND "toVersion" = "fromVersion" + 1
            AND ("actionType"::text <> 'MANGA_HIDDEN' OR "reason" IS NOT NULL)
        )
    );

COMMIT;
