-- CreateEnum
CREATE TYPE "CreationRequestActionType" AS ENUM ('INFO_REQUESTED', 'RESUBMITTED');

-- CreateTable
CREATE TABLE "ScanlationGroupRequestAction" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "type" "CreationRequestActionType" NOT NULL,
    "publicMessage" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanlationGroupRequestAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRequestAction" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "type" "CreationRequestActionType" NOT NULL,
    "publicMessage" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRequestAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanlationGroupRequestAction_requestId_createdAt_id_idx" ON "ScanlationGroupRequestAction"("requestId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ScanlationGroupRequestAction_actorUserId_idx" ON "ScanlationGroupRequestAction"("actorUserId");

-- CreateIndex
CREATE INDEX "CommunityRequestAction_requestId_createdAt_id_idx" ON "CommunityRequestAction"("requestId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CommunityRequestAction_actorUserId_idx" ON "CommunityRequestAction"("actorUserId");

-- AddForeignKey
ALTER TABLE "ScanlationGroupRequestAction" ADD CONSTRAINT "ScanlationGroupRequestAction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ScanlationGroupRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanlationGroupRequestAction" ADD CONSTRAINT "ScanlationGroupRequestAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRequestAction" ADD CONSTRAINT "CommunityRequestAction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunityRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRequestAction" ADD CONSTRAINT "CommunityRequestAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
