-- CreateEnum
CREATE TYPE "AdministrativeAuditActionType" AS ENUM (
    'GLOBAL_ROLE_GRANTED',
    'GLOBAL_ROLE_REVOKED',
    'GLOBAL_PERMISSION_GRANTED',
    'GLOBAL_PERMISSION_REVOKED',
    'USER_SUSPENDED',
    'USER_RESTORED'
);

-- CreateTable
CREATE TABLE "AdministrativeAuditEvent" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "actionType" "AdministrativeAuditActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeAuditEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdministrativeAuditEvent_reason_length_check"
        CHECK (length(btrim("reason")) BETWEEN 1 AND 2000),
    CONSTRAINT "AdministrativeAuditEvent_metadata_v1_check"
        CHECK (jsonb_typeof("metadata") = 'object' AND "metadata" @> '{"v": 1}'::jsonb)
);

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_actorUserId_createdAt_id_idx"
ON "AdministrativeAuditEvent"("actorUserId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_targetUserId_createdAt_id_idx"
ON "AdministrativeAuditEvent"("targetUserId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AdministrativeAuditEvent_actionType_createdAt_id_idx"
ON "AdministrativeAuditEvent"("actionType", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "AdministrativeAuditEvent"
ADD CONSTRAINT "AdministrativeAuditEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeAuditEvent"
ADD CONSTRAINT "AdministrativeAuditEvent_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
