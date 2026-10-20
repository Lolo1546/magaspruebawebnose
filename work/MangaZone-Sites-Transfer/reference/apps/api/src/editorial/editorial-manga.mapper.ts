import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client.js';
import { mangaCoverUrl } from '../storage/manga-cover-url.js';
import type {
  EditorialMangaDetailDto,
  EditorialMangaSummaryDto,
} from './dto/editorial-manga-response.dto.js';

const coverSelect = {
  id: true,
  storageKey: true,
  status: true,
  width: true,
  height: true,
} satisfies Prisma.AssetSelect;

export const editorialMangaSummarySelect = {
  id: true,
  slug: true,
  title: true,
  editorialStatus: true,
  contentRating: true,
  type: true,
  demography: true,
  status: true,
  version: true,
  updatedAt: true,
  coverAsset: { select: coverSelect },
} satisfies Prisma.MangaSelect;

export const editorialMangaDetailSelect = {
  ...editorialMangaSummarySelect,
  originalTitle: true,
  description: true,
  publicationYear: true,
  aliases: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { alias: true, languageCode: true },
  },
  genres: {
    orderBy: { genre: { name: 'asc' } },
    select: { genre: { select: { id: true, slug: true, name: true } } },
  },
  creators: {
    orderBy: [{ creator: { name: 'asc' } }, { contributionType: 'asc' }],
    select: {
      contributionType: true,
      creator: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.MangaSelect;

type SummaryRow = Prisma.MangaGetPayload<{
  select: typeof editorialMangaSummarySelect;
}>;
type DetailRow = Prisma.MangaGetPayload<{
  select: typeof editorialMangaDetailSelect;
}>;

@Injectable()
export class EditorialMangaMapper {
  constructor(private readonly config: ConfigService) {}

  toSummary(row: SummaryRow): EditorialMangaSummaryDto {
    const cover = row.coverAsset;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      editorialStatus: row.editorialStatus,
      contentRating: row.contentRating,
      type: row.type,
      demography: row.demography,
      status: row.status,
      version: row.version,
      cover: cover
        ? {
            id: cover.id,
            status: cover.status,
            url: mangaCoverUrl(
              row.id,
              cover,
              this.config.get<string>('MEDIA_API_ORIGIN'),
            ),
            width: cover.width,
            height: cover.height,
          }
        : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  toDetail(row: DetailRow): EditorialMangaDetailDto {
    return {
      ...this.toSummary(row),
      originalTitle: row.originalTitle,
      description: row.description,
      publicationYear: row.publicationYear,
      aliases: row.aliases.map(({ alias, languageCode }) => ({
        alias,
        languageCode,
      })),
      genres: row.genres.map(({ genre }) => genre),
      creators: row.creators.map(({ creator, contributionType }) => ({
        id: creator.id,
        name: creator.name,
        contributionType,
      })),
    };
  }
}
