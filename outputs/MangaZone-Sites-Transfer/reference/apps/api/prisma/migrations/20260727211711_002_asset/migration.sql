-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY', 'QUARANTINED', 'REJECTED', 'DELETED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avatarAssetId" UUID,
ADD COLUMN     "bannerAssetId" UUID;

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" "AssetStatus" NOT NULL,
    "ownerUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Asset_sizeBytes_nonnegative_check" CHECK ("sizeBytes" >= 0),
    CONSTRAINT "Asset_width_positive_check" CHECK ("width" IS NULL OR "width" > 0),
    CONSTRAINT "Asset_height_positive_check" CHECK ("height" IS NULL OR "height" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_ownerUserId_idx" ON "Asset"("ownerUserId");

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

-- CreateIndex
CREATE INDEX "Profile_avatarAssetId_idx" ON "Profile"("avatarAssetId");

-- CreateIndex
CREATE INDEX "Profile_bannerAssetId_idx" ON "Profile"("bannerAssetId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_avatarAssetId_fkey" FOREIGN KEY ("avatarAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_bannerAssetId_fkey" FOREIGN KEY ("bannerAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
