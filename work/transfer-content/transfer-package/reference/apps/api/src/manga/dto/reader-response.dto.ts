import { ChapterKind } from '../../../generated/prisma/client.js';
import { ChapterReleaseGroupDto } from './chapter-index-response.dto.js';

export interface ReaderMangaDto {
  id: string;
  slug: string;
  title: string;
}

export interface ReaderChapterDto {
  id: string;
  readerKey: string;
  kind: ChapterKind;
  number: number | null;
  displayLabel: string;
  title: string | null;
  sortOrder: number;
}

export interface ReaderReleaseDto {
  id: string;
  language: string;
  publishedAt: string; // ISO string
  groups: ChapterReleaseGroupDto[];
}

export interface ReaderPageDto {
  /** Contiguous 1-based reading position after ordering by DB pageNumber. */
  index: number;
  url: string;
  width: number;
  height: number;
}

export interface ReaderNavigationTargetDto {
  readerKey: string;
  displayLabel: string;
}

export interface ReaderNavigationDto {
  previous: ReaderNavigationTargetDto | null;
  next: ReaderNavigationTargetDto | null;
}

export interface ReaderResponseDto {
  manga: ReaderMangaDto;
  chapter: ReaderChapterDto;
  release: ReaderReleaseDto;
  availableReleases: ReaderReleaseDto[];
  pages: ReaderPageDto[];
  navigation: ReaderNavigationDto;
}
