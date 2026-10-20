export class HistoryMangaDto {
  id!: string;
  slug!: string;
  title!: string;
  coverUrl!: string;
}

export class HistoryChapterDto {
  id!: string;
  readerKey!: string;
  label!: string;
}

export class HistoryReleaseDto {
  id!: string;
}

export class HistoryReadingDto {
  lastPageNumber!: number;
  progressPercent!: number;
  firstReadAt!: string; // ISO
  lastReadAt!: string; // ISO
  completedAt!: string | null; // ISO
}

export class HistoryItemDto {
  manga!: HistoryMangaDto;
  chapter!: HistoryChapterDto;
  release!: HistoryReleaseDto | null;
  reading!: HistoryReadingDto;
}

export class HistoryResponseDto {
  items!: HistoryItemDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
}
