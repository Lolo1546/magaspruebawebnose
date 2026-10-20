import {
  MangaStatus,
  MangaType,
  MangaDemography,
} from '../../../generated/prisma/client.js';

export interface MangaCatalogAssetDto {
  url: string;
  width: number | null;
  height: number | null;
}

export interface MangaCatalogItemDto {
  slug: string;
  title: string;
  type: MangaType;
  demography: MangaDemography | null;
  status: MangaStatus;
  publicationYear: number | null;
  cover: MangaCatalogAssetDto | null;
  genres: string[];
  popularity: number;
  averageScore: number | null;
  latestChapter: number | null;
}

export interface MangaCatalogPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface MangaCatalogResponseDto {
  items: MangaCatalogItemDto[];
  pagination: MangaCatalogPaginationDto;
}
