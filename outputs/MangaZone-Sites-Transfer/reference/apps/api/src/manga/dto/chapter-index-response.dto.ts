import { ChapterKind } from '../../../generated/prisma/client.js';

export interface ChapterReleaseGroupDto {
  slug: string;
  name: string;
}

export interface ChapterReleaseSummaryDto {
  id: string;
  language: string;
  publishedAt: string; // ISO string
  groups: ChapterReleaseGroupDto[];
}

export interface ChapterIndexItemDto {
  id: string; // opaque id
  readerKey: string;
  kind: ChapterKind;
  number: number | null;
  displayLabel: string;
  sortOrder: number;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: string; // ISO string, max(publishedAt)
  releases: ChapterReleaseSummaryDto[];
}

export interface ChapterIndexPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface ChapterIndexResponseDto {
  items: ChapterIndexItemDto[];
  pagination: ChapterIndexPaginationDto;
  groups: ChapterReleaseGroupDto[];
}
