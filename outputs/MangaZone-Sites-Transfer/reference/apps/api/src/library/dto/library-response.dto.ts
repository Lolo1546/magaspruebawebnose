import { LibraryStatus } from '../../../generated/prisma/client.js';

export interface LibraryMangaDto {
  id: string;
  slug: string;
  title: string;
  type: string;
  cover: {
    url: string;
    width: number | null;
    height: number | null;
  } | null;
  genres: string[];
}

export interface LibraryEntryDto {
  status: LibraryStatus;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryItemDto {
  manga: LibraryMangaDto;
  library: LibraryEntryDto;
}

export interface LibraryStatsDto {
  total: number;
  reading: number;
  planned: number;
  completed: number;
  paused: number;
  dropped: number;
}

export interface LibraryListResponseDto {
  items: LibraryItemDto[];
  stats: LibraryStatsDto;
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
