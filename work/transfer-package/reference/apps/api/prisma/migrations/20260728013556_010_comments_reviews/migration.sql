-- CreateEnum
CREATE TYPE "PostCommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateTable
CREATE TABLE "PostComment" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "parentCommentId" UUID,
    "body" TEXT NOT NULL,
    "status" "PostCommentStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PostComment_body_not_blank_check" CHECK (BTRIM("body") <> ''),
    CONSTRAINT "PostComment_parent_not_self_check" CHECK (
        "parentCommentId" IS NULL OR "parentCommentId" <> "id"
    )
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "spoilerChapterId" UUID,
    "spoilerLabel" VARCHAR(120),
    "status" "ReviewStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_score_range_check" CHECK ("score" BETWEEN 1 AND 10),
    CONSTRAINT "Review_body_not_blank_check" CHECK (BTRIM("body") <> ''),
    CONSTRAINT "Review_spoiler_metadata_check" CHECK (
        "isSpoiler" OR ("spoilerChapterId" IS NULL AND "spoilerLabel" IS NULL)
    ),
    CONSTRAINT "Review_spoilerLabel_not_blank_check" CHECK (
        "spoilerLabel" IS NULL OR BTRIM("spoilerLabel") <> ''
    )
);

-- CreateTable
CREATE TABLE "ReviewVote" (
    "userId" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("userId","reviewId")
);

-- CreateIndex
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_authorUserId_createdAt_idx" ON "PostComment"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_parentCommentId_createdAt_idx" ON "PostComment"("parentCommentId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_status_createdAt_idx" ON "PostComment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_mangaId_createdAt_idx" ON "Review"("mangaId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_mangaId_status_score_idx" ON "Review"("mangaId", "status", "score");

-- CreateIndex
CREATE INDEX "Review_spoilerChapterId_idx" ON "Review"("spoilerChapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_mangaId_key" ON "Review"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "ReviewVote_reviewId_idx" ON "ReviewVote"("reviewId");

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "PostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_spoilerChapterId_fkey" FOREIGN KEY ("spoilerChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
