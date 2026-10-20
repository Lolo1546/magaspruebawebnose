-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "CommunityRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateTable
CREATE TABLE "Community" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "description" TEXT,
    "status" "CommunityStatus" NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "relatedMangaId" UUID,
    "avatarAssetId" UUID,
    "bannerAssetId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySlugHistory" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunitySlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRequest" (
    "id" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "proposedName" TEXT NOT NULL,
    "proposedNameNormalized" TEXT NOT NULL,
    "description" TEXT,
    "relatedMangaId" UUID,
    "status" "CommunityRequestStatus" NOT NULL,
    "reviewerUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewReason" TEXT,
    "createdCommunityId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommunityRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityRequest_terminal_reviewedAt_check" CHECK (
        "status" NOT IN ('APPROVED', 'REJECTED') OR "reviewedAt" IS NOT NULL
    ),
    CONSTRAINT "CommunityRequest_createdCommunity_approved_check" CHECK (
        "createdCommunityId" IS NULL OR "status" = 'APPROVED'
    )
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CommunityMemberRole" NOT NULL,
    "status" "CommunityMemberStatus" NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityMember_status_leftAt_check" CHECK (
        ("status" IN ('ACTIVE', 'SUSPENDED') AND "leftAt" IS NULL)
        OR ("status" IN ('LEFT', 'REMOVED') AND "leftAt" IS NOT NULL)
    ),
    CONSTRAINT "CommunityMember_leftAt_chronology_check" CHECK (
        "leftAt" IS NULL OR "leftAt" >= "joinedAt"
    )
);

-- CreateTable
CREATE TABLE "Post" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "spoilerChapterId" UUID,
    "spoilerLabel" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Post_spoiler_metadata_check" CHECK (
        "isSpoiler" OR ("spoilerChapterId" IS NULL AND "spoilerLabel" IS NULL)
    ),
    CONSTRAINT "Post_spoilerLabel_not_blank_check" CHECK (
        "spoilerLabel" IS NULL OR BTRIM("spoilerLabel") <> ''
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_status_idx" ON "Community"("status");

-- CreateIndex
CREATE INDEX "Community_ownerUserId_idx" ON "Community"("ownerUserId");

-- CreateIndex
CREATE INDEX "Community_relatedMangaId_idx" ON "Community"("relatedMangaId");

-- CreateIndex
CREATE INDEX "Community_createdAt_idx" ON "Community"("createdAt");

-- CreateIndex
CREATE INDEX "Community_nameNormalized_idx" ON "Community"("nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySlugHistory_slug_key" ON "CommunitySlugHistory"("slug");

-- CreateIndex
CREATE INDEX "CommunitySlugHistory_communityId_idx" ON "CommunitySlugHistory"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRequest_createdCommunityId_key" ON "CommunityRequest"("createdCommunityId");

-- CreateIndex
CREATE INDEX "CommunityRequest_status_createdAt_idx" ON "CommunityRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityRequest_requesterUserId_idx" ON "CommunityRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "CommunityRequest_reviewerUserId_idx" ON "CommunityRequest"("reviewerUserId");

-- CreateIndex
CREATE INDEX "CommunityRequest_relatedMangaId_idx" ON "CommunityRequest"("relatedMangaId");

-- CreateIndex
CREATE INDEX "CommunityRequest_proposedNameNormalized_idx" ON "CommunityRequest"("proposedNameNormalized");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_status_idx" ON "CommunityMember"("communityId", "status");

-- CreateIndex
CREATE INDEX "CommunityMember_userId_status_idx" ON "CommunityMember"("userId", "status");

-- Preserve historical periods while allowing at most one open membership per user and community.
CREATE UNIQUE INDEX "CommunityMember_open_membership_key"
ON "CommunityMember"("communityId", "userId")
WHERE "leftAt" IS NULL;

-- OWNER is only a membership mirror; when present, at most one open OWNER row may exist.
CREATE UNIQUE INDEX "CommunityMember_open_owner_key"
ON "CommunityMember"("communityId")
WHERE "leftAt" IS NULL AND "role" = 'OWNER';

-- CreateIndex
CREATE INDEX "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_authorUserId_createdAt_idx" ON "Post"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_status_createdAt_idx" ON "Post"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_spoilerChapterId_idx" ON "Post"("spoilerChapterId");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_relatedMangaId_fkey" FOREIGN KEY ("relatedMangaId") REFERENCES "Manga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_avatarAssetId_fkey" FOREIGN KEY ("avatarAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_bannerAssetId_fkey" FOREIGN KEY ("bannerAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySlugHistory" ADD CONSTRAINT "CommunitySlugHistory_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRequest" ADD CONSTRAINT "CommunityRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRequest" ADD CONSTRAINT "CommunityRequest_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRequest" ADD CONSTRAINT "CommunityRequest_relatedMangaId_fkey" FOREIGN KEY ("relatedMangaId") REFERENCES "Manga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRequest" ADD CONSTRAINT "CommunityRequest_createdCommunityId_fkey" FOREIGN KEY ("createdCommunityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_spoilerChapterId_fkey" FOREIGN KEY ("spoilerChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
