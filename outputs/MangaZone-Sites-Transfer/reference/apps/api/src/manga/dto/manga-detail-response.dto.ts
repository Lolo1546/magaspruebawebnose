import {
  MangaStatus,
  MangaType,
  MangaDemography,
  ContentRating,
} from '../../../generated/prisma/client.js';
import { MangaCatalogAssetDto } from './manga-catalog-response.dto.js';

export interface MangaDetailGenreDto {
  slug: string;
  name: string;
}

export interface MangaDetailCreatorDto {
  name: string;
  role: string;
}

export interface MangaDetailStatsDto {
  popularity: number;
  averageScore: number | null;
  reviewCount: number;
}

export interface MangaDetailResponseDto {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  description: string | null;
  type: MangaType;
  demography: MangaDemography | null;
  status: MangaStatus;
  publicationYear: number | null;
  contentRating: ContentRating;
  cover: MangaCatalogAssetDto | null;
  aliases: string[];
  genres: MangaDetailGenreDto[];
  creators: MangaDetailCreatorDto[];
  stats: MangaDetailStatsDto;
}
