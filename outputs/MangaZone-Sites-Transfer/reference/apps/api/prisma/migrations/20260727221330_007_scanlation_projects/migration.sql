-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ABANDONED', 'COMPLETED', 'AVAILABLE_FOR_CONTINUATION', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ProjectGroupStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProjectRequestType" AS ENUM ('CREATE', 'JOIN', 'CONTINUE', 'COLLABORATE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ProjectRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO', 'CANCELLED');

-- CreateTable
CREATE TABLE "ScanlationProject" (
    "id" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ScanlationProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectGroup" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "status" "ProjectGroupStatus" NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectGroup_status_leftAt_check" CHECK (
        ("status" = 'ACTIVE' AND "leftAt" IS NULL)
        OR ("status" IN ('LEFT', 'REMOVED') AND "leftAt" IS NOT NULL)
    ),
    CONSTRAINT "ProjectGroup_leftAt_chronology_check" CHECK ("leftAt" IS NULL OR "leftAt" >= "joinedAt")
);

-- CreateTable
CREATE TABLE "ProjectRequest" (
    "id" UUID NOT NULL,
    "requestType" "ProjectRequestType" NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "requesterGroupId" UUID,
    "projectId" UUID,
    "mangaId" UUID,
    "targetGroupId" UUID,
    "status" "ProjectRequestStatus" NOT NULL,
    "message" TEXT,
    "reviewerUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProjectRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectRequest_terminal_reviewedAt_check" CHECK (
        "status" NOT IN ('APPROVED', 'REJECTED') OR "reviewedAt" IS NOT NULL
    )
);

-- CreateTable
CREATE TABLE "ProjectAssignmentHistory" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "fromChapterId" UUID,
    "toChapterId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssignmentHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectAssignmentHistory_endedAt_chronology_check" CHECK (
        "endedAt" IS NULL OR "endedAt" >= "startedAt"
    )
);

-- CreateIndex
CREATE INDEX "ScanlationProject_mangaId_idx" ON "ScanlationProject"("mangaId");

-- CreateIndex
CREATE INDEX "ScanlationProject_status_idx" ON "ScanlationProject"("status");

-- CreateIndex
CREATE INDEX "ScanlationProject_createdAt_idx" ON "ScanlationProject"("createdAt");

-- CreateIndex
CREATE INDEX "ScanlationProject_createdByUserId_idx" ON "ScanlationProject"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProjectGroup_projectId_status_idx" ON "ProjectGroup"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectGroup_groupId_status_idx" ON "ProjectGroup"("groupId", "status");

-- A group can have several historical participation periods, but only one open period per project.
CREATE UNIQUE INDEX "ProjectGroup_open_participation_key"
ON "ProjectGroup"("projectId", "groupId")
WHERE "leftAt" IS NULL;

-- CreateIndex
CREATE INDEX "ProjectRequest_status_createdAt_idx" ON "ProjectRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRequest_projectId_idx" ON "ProjectRequest"("projectId");

-- CreateIndex
CREATE INDEX "ProjectRequest_mangaId_idx" ON "ProjectRequest"("mangaId");

-- CreateIndex
CREATE INDEX "ProjectRequest_requesterGroupId_idx" ON "ProjectRequest"("requesterGroupId");

-- CreateIndex
CREATE INDEX "ProjectRequest_targetGroupId_idx" ON "ProjectRequest"("targetGroupId");

-- CreateIndex
CREATE INDEX "ProjectRequest_requesterUserId_idx" ON "ProjectRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "ProjectRequest_reviewerUserId_idx" ON "ProjectRequest"("reviewerUserId");

-- CreateIndex
CREATE INDEX "ProjectAssignmentHistory_projectId_startedAt_idx" ON "ProjectAssignmentHistory"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "ProjectAssignmentHistory_groupId_startedAt_idx" ON "ProjectAssignmentHistory"("groupId", "startedAt");

-- AddForeignKey
ALTER TABLE "ScanlationProject" ADD CONSTRAINT "ScanlationProject_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationProject" ADD CONSTRAINT "ScanlationProject_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGroup" ADD CONSTRAINT "ProjectGroup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScanlationProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGroup" ADD CONSTRAINT "ProjectGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_requesterGroupId_fkey" FOREIGN KEY ("requesterGroupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScanlationProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignmentHistory" ADD CONSTRAINT "ProjectAssignmentHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScanlationProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignmentHistory" ADD CONSTRAINT "ProjectAssignmentHistory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScanlationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignmentHistory" ADD CONSTRAINT "ProjectAssignmentHistory_fromChapterId_fkey" FOREIGN KEY ("fromChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignmentHistory" ADD CONSTRAINT "ProjectAssignmentHistory_toChapterId_fkey" FOREIGN KEY ("toChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
