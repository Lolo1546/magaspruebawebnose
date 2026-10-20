CREATE TABLE "ReadingReleaseProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "chapterReleaseId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReadingReleaseProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReadingReleaseProgress_userId_chapterReleaseId_key" ON "ReadingReleaseProgress"("userId", "chapterReleaseId");
CREATE INDEX "ReadingReleaseProgress_chapterReleaseId_idx" ON "ReadingReleaseProgress"("chapterReleaseId");

ALTER TABLE "ReadingReleaseProgress" ADD CONSTRAINT "ReadingReleaseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingReleaseProgress" ADD CONSTRAINT "ReadingReleaseProgress_chapterReleaseId_fkey" FOREIGN KEY ("chapterReleaseId") REFERENCES "ChapterRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
