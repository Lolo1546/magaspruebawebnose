-- CreateEnum
CREATE TYPE "ScanlationGroupStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ScanlationGroupMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ScanlationGroupRole" AS ENUM ('FOUNDER', 'ADMIN', 'UPLOADER', 'TRANSLATOR', 'CLEANER', 'REDRAWER', 'TYPESETTER', 'PROOFREADER');

-- CreateEnum
CREATE TYPE "ScanlationGroupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

-- CreateTable
CREATE TABLE "ScanlationGroup" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "description" TEXT,
    "language" VARCHAR(35) NOT NULL,
    "website" TEXT,
    "status" "ScanlationGroupStatus" NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID,
    "logoAssetId" UUID,
    "bannerAssetId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ScanlationGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScanlationGroup_verifiedAt_required_check" CHECK ("status" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "ScanlationGroupSlugHistory" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanlationGroupSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanlationGroupMember" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ScanlationGroupMemberStatus" NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanlationGroupMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScanlationGroupMember_status_leftAt_check" CHECK (
        ("status" IN ('ACTIVE', 'SUSPENDED') AND "leftAt" IS NULL)
        OR ("status" IN ('LEFT', 'REMOVED') AND "leftAt" IS NOT NULL)
    ),
    CONSTRAINT "ScanlationGroupMember_leftAt_chronology_check" CHECK ("leftAt" IS NULL OR "leftAt" >= "joinedAt")
);

-- CreateTable
CREATE TABLE "ScanlationGroupMemberRole" (
    "membershipId" UUID NOT NULL,
    "role" "ScanlationGroupRole" NOT NULL,

    CONSTRAINT "ScanlationGroupMemberRole_pkey" PRIMARY KEY ("membershipId","role")
);

-- CreateTable
CREATE TABLE "ScanlationGroupRequest" (
    "id" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "proposedName" TEXT NOT NULL,
    "proposedNameNormalized" TEXT NOT NULL,
    "description" TEXT,
    "language" VARCHAR(35) NOT NULL,
    "website" TEXT,
    "status" "ScanlationGroupRequestStatus" NOT NULL,
    "reviewerUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewReason" TEXT,
    "createdGroupId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ScanlationGroupRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScanlationGroupRequest_terminal_reviewedAt_check" CHECK (
        "status" NOT IN ('APPROVED', 'REJECTED') OR "reviewedAt" IS NOT NULL
    ),
    CONSTRAINT "ScanlationGroupRequest_createdGroup_approved_check" CHECK (
        "createdGroupId" IS NULL OR "status" = 'APPROVED'
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "ScanlationGroup_slug_key" ON "ScanlationGroup"("slug");

-- CreateIndex
CREATE INDEX "ScanlationGroup_status_idx" ON "ScanlationGroup"("status");

-- CreateIndex
CREATE INDEX "ScanlationGroup_createdByUserId_idx" ON "ScanlationGroup"("createdByUserId");

-- CreateIndex
CREATE INDEX "ScanlationGroup_createdAt_idx" ON "ScanlationGroup"("createdAt");

-- CreateIndex
CREATE INDEX "ScanlationGroup_nameNormalized_idx" ON "ScanlationGroup"("nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "ScanlationGroupSlugHistory_slug_key" ON "ScanlationGroupSlugHistory"("slug");

-- CreateIndex
CREATE INDEX "ScanlationGroupSlugHistory_groupId_idx" ON "ScanlationGroupSlugHistory"("groupId");

-- CreateIndex
CREATE INDEX "ScanlationGroupMember_groupId_status_idx" ON "ScanlationGroupMember"("groupId", "status");

-- CreateIndex
CREATE INDEX "ScanlationGroupMember_userId_status_idx" ON "ScanlationGroupMember"("userId", "status");

-- Ensure that a user has at most one current membership period per group.
CREATE UNIQUE INDEX "ScanlationGroupMember_open_membership_key"
ON "ScanlationGroupMember"("groupId", "userId")
WHERE "leftAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ScanlationGroupRequest_createdGroupId_key" ON "ScanlationGroupRequest"("createdGroupId");

-- CreateIndex
CREATE INDEX "ScanlationGroupRequest_status_createdAt_idx" ON "ScanlationGroupRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ScanlationGroupRequest_requesterUserId_idx" ON "ScanlationGroupRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "ScanlationGroupRequest_reviewerUserId_idx" ON "ScanlationGroupRequest"("reviewerUserId");

-- CreateIndex
CREATE INDEX "ScanlationGroupRequest_proposedNameNormalized_idx" ON "ScanlationGroupRequest"("proposedNameNormalized");

-- AddForeignKey
ALTER TABLE "ScanlationGroup" ADD CONSTRAINT "ScanlationGroup_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroup" ADD CONSTRAINT "ScanlationGroup_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroup" ADD CONSTRAINT "ScanlationGroup_bannerAssetId_fkey" FOREIGN KEY ("bannerAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupSlugHistory" ADD CONSTRAINT "ScanlationGroupSlugHistory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupMember" ADD CONSTRAINT "ScanlationGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupMember" ADD CONSTRAINT "ScanlationGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupMemberRole" ADD CONSTRAINT "ScanlationGroupMemberRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ScanlationGroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupRequest" ADD CONSTRAINT "ScanlationGroupRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupRequest" ADD CONSTRAINT "ScanlationGroupRequest_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupRequest" ADD CONSTRAINT "ScanlationGroupRequest_createdGroupId_fkey" FOREIGN KEY ("createdGroupId") REFERENCES "ScanlationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
