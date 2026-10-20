import type { Prisma } from '../../generated/prisma/client.js';
import type {
  EditorialChapterDto,
  EditorialReleaseDto,
} from './dto/editorial-chapter-response.dto.js';

export const editorialChapterSelect = {
  id: true,
  mangaId: true,
  kind: true,
  number: true,
  displayLabel: true,
  sortOrder: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChapterSelect;

export const editorialReleaseSelect = {
  id: true,
  chapterId: true,
  projectId: true,
  publishingGroupId: true,
  language: true,
  status: true,
  version: true,
  supersedesReleaseId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChapterReleaseSelect;

export function mapEditorialChapter(
  row: Prisma.ChapterGetPayload<{ select: typeof editorialChapterSelect }>,
): EditorialChapterDto {
  return {
    id: row.id,
    mangaId: row.mangaId,
    kind: row.kind,
    number: row.number?.toString() ?? null,
    displayLabel: row.displayLabel,
    sortOrder: row.sortOrder.toString(),
    title: row.title,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapEditorialRelease(
  row: Prisma.ChapterReleaseGetPayload<{
    select: typeof editorialReleaseSelect;
  }>,
): EditorialReleaseDto {
  return {
    id: row.id,
    chapterId: row.chapterId,
    projectId: row.projectId,
    publishingGroupId: row.publishingGroupId,
    language: row.language,
    status: row.status,
    version: row.version,
    supersedesReleaseId: row.supersedesReleaseId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
