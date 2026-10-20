import type {
  AssetStatus,
  ContentRating,
  ContributionType,
  MangaEditorialStatus,
  MangaStatus,
  MangaType,
  MangaDemography,
} from '../../../generated/prisma/client.js';

export interface EditorialMangaSummaryDto {
  id: string;
  slug: string;
  title: string;
  editorialStatus: MangaEditorialStatus;
  contentRating: ContentRating;
  type: MangaType;
  demography: MangaDemography | null;
  status: MangaStatus;
  version: number;
  cover: {
    id: string;
    status: AssetStatus;
    url: string | null;
    width: number | null;
    height: number | null;
  } | null;
  updatedAt: string;
}

export interface EditorialMangaDetailDto extends EditorialMangaSummaryDto {
  originalTitle: string | null;
  description: string | null;
  publicationYear: number | null;
  aliases: Array<{ alias: string; languageCode: string | null }>;
  genres: Array<{ id: string; slug: string; name: string }>;
  creators: Array<{
    id: string;
    name: string;
    contributionType: ContributionType;
  }>;
}

export interface EditorialMangaResponseDto {
  manga: EditorialMangaDetailDto;
}

export interface EditorialMangaListDto {
  items: EditorialMangaSummaryDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}
