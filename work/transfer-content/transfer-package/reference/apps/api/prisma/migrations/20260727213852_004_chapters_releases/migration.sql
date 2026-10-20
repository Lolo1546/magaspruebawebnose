-- CreateEnum
CREATE TYPE "ChapterKind" AS ENUM ('REGULAR', 'SPECIAL', 'ONE_SHOT', 'EXTRA');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChapterReleaseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Chapter" (
    "id" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "kind" "ChapterKind" NOT NULL,
    "number" DECIMAL(12,4),
    "displayLabel" TEXT NOT NULL,
    "sortOrder" DECIMAL(12,4) NOT NULL,
    "title" TEXT,
    "status" "ChapterStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Chapter_number_nonnegative_check" CHECK ("number" IS NULL OR "number" >= 0),
    CONSTRAINT "Chapter_sortOrder_nonnegative_check" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "ChapterRelease" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "language" VARCHAR(35) NOT NULL,
    "status" "ChapterReleaseStatus" NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "uploadedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChapterRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterPage" (
    "id" UUID NOT NULL,
    "chapterReleaseId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "assetId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterPage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChapterPage_pageNumber_positive_check" CHECK ("pageNumber" > 0)
);

-- CreateIndex
CREATE INDEX "Chapter_status_idx" ON "Chapter"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_mangaId_kind_number_key" ON "Chapter"("mangaId", "kind", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_mangaId_kind_displayLabel_key" ON "Chapter"("mangaId", "kind", "displayLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_mangaId_sortOrder_key" ON "Chapter"("mangaId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChapterRelease_chapterId_status_publishedAt_idx" ON "ChapterRelease"("chapterId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "ChapterRelease_status_publishedAt_idx" ON "ChapterRelease"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ChapterRelease_language_idx" ON "ChapterRelease"("language");

-- CreateIndex
CREATE INDEX "ChapterRelease_uploadedByUserId_idx" ON "ChapterRelease"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "ChapterPage_assetId_idx" ON "ChapterPage"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterPage_chapterReleaseId_pageNumber_key" ON "ChapterPage"("chapterReleaseId", "pageNumber");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPage" ADD CONSTRAINT "ChapterPage_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPage" ADD CONSTRAINT "ChapterPage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
