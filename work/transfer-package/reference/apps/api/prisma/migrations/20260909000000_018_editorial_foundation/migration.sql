BEGIN;

-- CreateEnum
CREATE TYPE "MangaEditorialStatus" AS ENUM ('DRAFT', 'PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "EditorialAuditActionType" AS ENUM ('PROJECT_CREATED', 'PROJECT_GROUP_ADDED', 'PROJECT_GROUP_REMOVED');

-- CreateEnum
CREATE TYPE "EditorialUploadPurpose" AS ENUM ('MANGA_PAGE', 'MANGA_COVER');

-- CreateEnum
CREATE TYPE "EditorialUploadState" AS ENUM ('PENDING', 'FINALIZED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "sha256" VARCHAR(64);

-- AlterTable
ALTER TABLE "Manga" ADD COLUMN     "editorialStatus" "MangaEditorialStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "normalizedTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ChapterRelease" ADD COLUMN     "publishingGroupId" UUID,
ADD COLUMN     "supersedesReleaseId" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "EditorialAuditEvent" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "actionType" "EditorialAuditActionType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialUploadIntent" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "purpose" "EditorialUploadPurpose" NOT NULL,
    "mangaId" UUID,
    "releaseId" UUID,
    "temporaryStorageKey" TEXT NOT NULL,
    "expectedBytes" BIGINT NOT NULL,
    "maxBytes" BIGINT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "state" "EditorialUploadState" NOT NULL DEFAULT 'PENDING',
    "finalizedAt" TIMESTAMPTZ(3),
    "assetId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialUploadIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditorialAuditEvent_projectId_createdAt_id_idx" ON "EditorialAuditEvent"("projectId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EditorialAuditEvent_actorUserId_createdAt_id_idx" ON "EditorialAuditEvent"("actorUserId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EditorialAuditEvent_groupId_idx" ON "EditorialAuditEvent"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialUploadIntent_temporaryStorageKey_key" ON "EditorialUploadIntent"("temporaryStorageKey");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialUploadIntent_assetId_key" ON "EditorialUploadIntent"("assetId");

-- CreateIndex
CREATE INDEX "EditorialUploadIntent_state_expiresAt_idx" ON "EditorialUploadIntent"("state", "expiresAt");

-- CreateIndex
CREATE INDEX "EditorialUploadIntent_actorUserId_createdAt_idx" ON "EditorialUploadIntent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "EditorialUploadIntent_mangaId_idx" ON "EditorialUploadIntent"("mangaId");

-- CreateIndex
CREATE INDEX "EditorialUploadIntent_releaseId_idx" ON "EditorialUploadIntent"("releaseId");

-- CreateIndex
CREATE INDEX "Manga_normalizedTitle_idx" ON "Manga"("normalizedTitle");

-- CreateIndex
CREATE INDEX "ChapterRelease_publishingGroupId_idx" ON "ChapterRelease"("publishingGroupId");

-- CreateIndex
CREATE INDEX "ChapterRelease_supersedesReleaseId_idx" ON "ChapterRelease"("supersedesReleaseId");

-- AddForeignKey
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_publishingGroupId_fkey" FOREIGN KEY ("publishingGroupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_supersedesReleaseId_fkey" FOREIGN KEY ("supersedesReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScanlationProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialAuditEvent" ADD CONSTRAINT "EditorialAuditEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialUploadIntent" ADD CONSTRAINT "EditorialUploadIntent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialUploadIntent" ADD CONSTRAINT "EditorialUploadIntent_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialUploadIntent" ADD CONSTRAINT "EditorialUploadIntent_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ChapterRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialUploadIntent" ADD CONSTRAINT "EditorialUploadIntent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the already-public non-ADULT legacy catalog; future rows default to DRAFT.
UPDATE "Manga" SET "editorialStatus" =
    CASE WHEN "contentRating" = 'ADULT' THEN 'HIDDEN'::"MangaEditorialStatus"
         ELSE 'PUBLIC'::"MangaEditorialStatus" END;

-- Root Unicode casing, independent of the deployment's default locale.
CREATE COLLATION "editorial_unicode" (provider = icu, locale = 'und', deterministic = true);

CREATE FUNCTION editorial_normalize_title(value TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
    SELECT upper(btrim(regexp_replace(value,
        U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+',
        ' ', 'g')) COLLATE "editorial_unicode")
$$;

UPDATE "Manga" SET "normalizedTitle" = editorial_normalize_title("title");

CREATE FUNCTION editorial_set_normalized_title() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW."normalizedTitle" := editorial_normalize_title(NEW."title");
    RETURN NEW;
END
$$;

CREATE TRIGGER "Manga_normalizedTitle_write"
BEFORE INSERT OR UPDATE OF "title", "normalizedTitle" ON "Manga"
FOR EACH ROW EXECUTE FUNCTION editorial_set_normalized_title();

ALTER TABLE "Manga" ADD CONSTRAINT "Manga_version_positive" CHECK ("version" > 0),
    ADD CONSTRAINT "Manga_adult_not_public" CHECK ("contentRating" <> 'ADULT' OR "editorialStatus" <> 'PUBLIC');
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_version_positive" CHECK ("version" > 0),
    ADD CONSTRAINT "ChapterRelease_not_self_replacement" CHECK ("supersedesReleaseId" IS NULL OR "supersedesReleaseId" <> "id");

CREATE UNIQUE INDEX "ChapterRelease_current_responsible_language_key"
ON "ChapterRelease" ("chapterId", lower(btrim("language") COLLATE "C"), "publishingGroupId")
WHERE "status" = 'PUBLISHED' AND "publishingGroupId" IS NOT NULL;

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sha256_format" CHECK ("sha256" IS NULL OR "sha256" ~ '^[0-9a-f]{64}$');
ALTER TABLE "EditorialUploadIntent"
    ADD CONSTRAINT "EditorialUploadIntent_context" CHECK (
        ("purpose" = 'MANGA_PAGE' AND "releaseId" IS NOT NULL AND "mangaId" IS NULL)
        OR ("purpose" = 'MANGA_COVER' AND "mangaId" IS NOT NULL AND "releaseId" IS NULL)),
    ADD CONSTRAINT "EditorialUploadIntent_bytes" CHECK ("expectedBytes" > 0 AND "maxBytes" >= "expectedBytes"),
    ADD CONSTRAINT "EditorialUploadIntent_expiry" CHECK ("expiresAt" > "createdAt"),
    ADD CONSTRAINT "EditorialUploadIntent_finalization" CHECK (
        ("state" = 'FINALIZED' AND "finalizedAt" IS NOT NULL AND "assetId" IS NOT NULL AND "finalizedAt" >= "createdAt")
        OR ("state" <> 'FINALIZED' AND "finalizedAt" IS NULL AND "assetId" IS NULL));

-- Register the canonical key without granting it to any user or role.
INSERT INTO "Permission" ("id", "key", "description", "updatedAt")
VALUES ('01992900-0000-7000-8000-000000000001', 'catalog.manage', 'Gestionar el catalogo editorial.', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
