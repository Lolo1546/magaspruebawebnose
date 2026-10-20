BEGIN;

CREATE TYPE "MangaCommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');
ALTER TYPE "ModerationTargetType" ADD VALUE 'MANGA_COMMENT';

CREATE TABLE "MangaComment" (
    "id" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "parentCommentId" UUID,
    "body" TEXT NOT NULL,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "status" "MangaCommentStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "editedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "MangaComment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MangaComment_body_not_blank_check" CHECK (BTRIM("body", U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> ''),
    CONSTRAINT "MangaComment_parent_not_self_check" CHECK ("parentCommentId" IS NULL OR "parentCommentId" <> "id"),
    CONSTRAINT "MangaComment_removed_deletedAt_check" CHECK (("status" = 'REMOVED') = ("deletedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "MangaComment_id_mangaId_key" ON "MangaComment"("id", "mangaId");
CREATE INDEX "MangaComment_mangaId_parentCommentId_createdAt_id_idx" ON "MangaComment"("mangaId", "parentCommentId", "createdAt", "id");
CREATE INDEX "MangaComment_parentCommentId_createdAt_id_idx" ON "MangaComment"("parentCommentId", "createdAt", "id");
CREATE INDEX "MangaComment_mangaId_status_idx" ON "MangaComment"("mangaId", "status");
CREATE INDEX "MangaComment_authorUserId_idx" ON "MangaComment"("authorUserId");

ALTER TABLE "MangaComment" ADD CONSTRAINT "MangaComment_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MangaComment" ADD CONSTRAINT "MangaComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MangaComment" ADD CONSTRAINT "MangaComment_parentCommentId_mangaId_fkey" FOREIGN KEY ("parentCommentId", "mangaId") REFERENCES "MangaComment"("id", "mangaId") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
