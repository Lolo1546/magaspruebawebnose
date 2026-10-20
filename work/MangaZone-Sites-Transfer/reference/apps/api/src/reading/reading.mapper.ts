import { ConfigService } from '@nestjs/config';
import {
  Chapter,
  Manga,
  ReadingHistoryEntry,
  Asset,
} from '../../generated/prisma/client.js';
import { HistoryItemDto } from './dto/history-response.dto.js';
import { mangaCoverUrl } from '../storage/manga-cover-url.js';
import { generateReaderKey } from '../manga/utils/chapter.utils.js';

export function getReaderMediaPolicy(config: ConfigService) {
  return {
    objectStorageBucket: config.get<string>('OBJECT_STORAGE_BUCKET'),
    objectStorageEndpoint: config.get<string>('OBJECT_STORAGE_ENDPOINT'),
    mediaApiOrigin: config.get<string>('MEDIA_API_ORIGIN'),
  };
}

export function formatChapterLabel(chapter: Pick<Chapter, 'number' | 'title'>) {
  if (chapter.number !== null) {
    return `Capítulo ${chapter.number.toString()}`;
  }
  return chapter.title || 'Capítulo especial';
}

export type HistoryEntryRaw = ReadingHistoryEntry & {
  manga: Manga & { coverAsset: Asset | null };
  chapter: Chapter;
};

export function mapHistoryEntry(
  entry: HistoryEntryRaw,
  policy: ReturnType<typeof getReaderMediaPolicy>,
): HistoryItemDto {
  const coverUrl =
    mangaCoverUrl(
      entry.manga.id,
      entry.manga.coverAsset,
      policy.mediaApiOrigin,
    ) ?? '';

  return {
    manga: {
      id: entry.manga.id,
      slug: entry.manga.slug,
      title: entry.manga.title,
      coverUrl,
    },
    chapter: {
      id: entry.chapter.id,
      readerKey: generateReaderKey(
        entry.chapter.kind,
        entry.chapter.number,
        entry.chapter.id,
      ),
      label: formatChapterLabel(entry.chapter),
    },
    release: entry.chapterReleaseId ? { id: entry.chapterReleaseId } : null,
    reading: {
      lastPageNumber: entry.lastPageNumber,
      progressPercent: entry.progressPercent,
      firstReadAt: entry.firstReadAt.toISOString(),
      lastReadAt: entry.lastReadAt.toISOString(),
      completedAt: entry.completedAt ? entry.completedAt.toISOString() : null,
    },
  };
}
