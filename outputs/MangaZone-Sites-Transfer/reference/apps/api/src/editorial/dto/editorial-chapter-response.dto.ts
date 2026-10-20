import type {
  ChapterKind,
  ChapterStatus,
  ChapterReleaseStatus,
} from '../../../generated/prisma/client.js';

export interface EditorialChapterDto {
  id: string;
  mangaId: string;
  kind: ChapterKind;
  number: string | null;
  displayLabel: string;
  sortOrder: string;
  title: string | null;
  status: ChapterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialReleaseDto {
  id: string;
  chapterId: string;
  projectId: string | null;
  publishingGroupId: string | null;
  language: string;
  status: ChapterReleaseStatus;
  version: number;
  supersedesReleaseId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
