-- CreateEnum
CREATE TYPE "MangaType" AS ENUM ('MANGA', 'MANHWA', 'MANHUA');

-- CreateEnum
CREATE TYPE "MangaStatus" AS ENUM ('ONGOING', 'COMPLETED', 'PAUSED', 'CANCELLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContentRating" AS ENUM ('GENERAL', 'TEEN', 'MATURE', 'ADULT');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('AUTHOR', 'ARTIST', 'STORY', 'ILLUSTRATION');

-- CreateTable
CREATE TABLE "Manga" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "type" "MangaType" NOT NULL,
    "status" "MangaStatus" NOT NULL,
    "description" TEXT,
    "coverAssetId" UUID,
    "publicationYear" INTEGER,
    "contentRating" "ContentRating" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Manga_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Manga_publicationYear_positive_check" CHECK ("publicationYear" IS NULL OR "publicationYear" > 0)
);

-- CreateTable
CREATE TABLE "MangaSlugHistory" (
    "id" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MangaSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaAlias" (
    "id" UUID NOT NULL,
    "mangaId" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "languageCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MangaAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaGenre" (
    "mangaId" UUID NOT NULL,
    "genreId" UUID NOT NULL,

    CONSTRAINT "MangaGenre_pkey" PRIMARY KEY ("mangaId","genreId")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "biography" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaCreator" (
    "mangaId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "contributionType" "ContributionType" NOT NULL,

    CONSTRAINT "MangaCreator_pkey" PRIMARY KEY ("mangaId","creatorId","contributionType")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manga_slug_key" ON "Manga"("slug");

-- CreateIndex
CREATE INDEX "Manga_type_idx" ON "Manga"("type");

-- CreateIndex
CREATE INDEX "Manga_status_idx" ON "Manga"("status");

-- CreateIndex
CREATE INDEX "Manga_contentRating_idx" ON "Manga"("contentRating");

-- CreateIndex
CREATE INDEX "Manga_createdAt_idx" ON "Manga"("createdAt");

-- CreateIndex
CREATE INDEX "Manga_coverAssetId_idx" ON "Manga"("coverAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaSlugHistory_slug_key" ON "MangaSlugHistory"("slug");

-- CreateIndex
CREATE INDEX "MangaSlugHistory_mangaId_idx" ON "MangaSlugHistory"("mangaId");

-- CreateIndex
CREATE INDEX "MangaAlias_normalizedAlias_idx" ON "MangaAlias"("normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "MangaAlias_mangaId_normalizedAlias_key" ON "MangaAlias"("mangaId", "normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "MangaGenre_genreId_idx" ON "MangaGenre"("genreId");

-- CreateIndex
CREATE INDEX "Creator_normalizedName_idx" ON "Creator"("normalizedName");

-- CreateIndex
CREATE INDEX "MangaCreator_creatorId_idx" ON "MangaCreator"("creatorId");

-- AddForeignKey
ALTER TABLE "Manga" ADD CONSTRAINT "Manga_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaSlugHistory" ADD CONSTRAINT "MangaSlugHistory_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaAlias" ADD CONSTRAINT "MangaAlias_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaGenre" ADD CONSTRAINT "MangaGenre_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaGenre" ADD CONSTRAINT "MangaGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaCreator" ADD CONSTRAINT "MangaCreator_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaCreator" ADD CONSTRAINT "MangaCreator_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
