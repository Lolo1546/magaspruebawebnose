-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('READING', 'PLAN_TO_READ', 'ON_HOLD', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "userId" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "status" "LibraryStatus" NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("userId","mangaId")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "userId" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "chapterReleaseId" UUID,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("userId","mangaId"),
    CONSTRAINT "ReadingProgress_pageNumber_positive_check" CHECK ("pageNumber" >= 1),
    CONSTRAINT "ReadingProgress_progressPercent_range_check" CHECK ("progressPercent" BETWEEN 0 AND 100)
);

-- CreateTable
CREATE TABLE "ReadingHistoryEntry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "chapterReleaseId" UUID,
    "lastPageNumber" INTEGER NOT NULL DEFAULT 1,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "firstReadAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ReadingHistoryEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReadingHistoryEntry_lastPageNumber_positive_check" CHECK ("lastPageNumber" >= 1),
    CONSTRAINT "ReadingHistoryEntry_progressPercent_range_check" CHECK ("progressPercent" BETWEEN 0 AND 100)
);

-- CreateTable
CREATE TABLE "UserList" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "ListVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserListItem" (
    "listId" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "position" INTEGER,
    "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserListItem_pkey" PRIMARY KEY ("listId","mangaId"),
    CONSTRAINT "UserListItem_position_nonnegative_check" CHECK ("position" IS NULL OR "position" >= 0)
);

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_status_updatedAt_idx" ON "LibraryEntry"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_isFavorite_updatedAt_idx" ON "LibraryEntry"("userId", "isFavorite", "updatedAt");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_lastReadAt_idx" ON "ReadingProgress"("userId", "lastReadAt");

-- CreateIndex
CREATE INDEX "ReadingProgress_mangaId_chapterId_idx" ON "ReadingProgress"("mangaId", "chapterId");

-- CreateIndex
CREATE INDEX "ReadingProgress_chapterReleaseId_idx" ON "ReadingProgress"("chapterReleaseId");

-- CreateIndex
CREATE INDEX "ReadingHistoryEntry_userId_lastReadAt_idx" ON "ReadingHistoryEntry"("userId", "lastReadAt");

-- CreateIndex
CREATE INDEX "ReadingHistoryEntry_userId_mangaId_lastReadAt_idx" ON "ReadingHistoryEntry"("userId", "mangaId", "lastReadAt");

-- CreateIndex
CREATE INDEX "ReadingHistoryEntry_mangaId_chapterId_idx" ON "ReadingHistoryEntry"("mangaId", "chapterId");

-- CreateIndex
CREATE INDEX "ReadingHistoryEntry_chapterReleaseId_idx" ON "ReadingHistoryEntry"("chapterReleaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingHistoryEntry_userId_chapterId_key" ON "ReadingHistoryEntry"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "UserList_userId_updatedAt_idx" ON "UserList"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserList_visibility_updatedAt_idx" ON "UserList"("visibility", "updatedAt");

-- CreateIndex
CREATE INDEX "UserListItem_listId_position_idx" ON "UserListItem"("listId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_mangaId_id_key" ON "Chapter"("mangaId", "id");

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_mangaId_chapterId_fkey" FOREIGN KEY ("mangaId", "chapterId") REFERENCES "Chapter"("mangaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistoryEntry" ADD CONSTRAINT "ReadingHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistoryEntry" ADD CONSTRAINT "ReadingHistoryEntry_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistoryEntry" ADD CONSTRAINT "ReadingHistoryEntry_mangaId_chapterId_fkey" FOREIGN KEY ("mangaId", "chapterId") REFERENCES "Chapter"("mangaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistoryEntry" ADD CONSTRAINT "ReadingHistoryEntry_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserList" ADD CONSTRAINT "UserList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListItem" ADD CONSTRAINT "UserListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "UserList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListItem" ADD CONSTRAINT "UserListItem_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
