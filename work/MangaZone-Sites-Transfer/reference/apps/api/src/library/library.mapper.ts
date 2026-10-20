import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Genre } from '../../generated/prisma/client.js';
import { mangaCoverUrl } from '../storage/manga-cover-url.js';
import {
  LibraryItemDto,
  LibraryListResponseDto,
  LibraryStatsDto,
} from './dto/library-response.dto.js';

export type LibraryEntryQueryResult = Prisma.LibraryEntryGetPayload<{
  include: {
    manga: {
      include: {
        coverAsset: true;
        genres: { include: { genre: true } };
      };
    };
  };
}>;

@Injectable()
export class LibraryMapper {
  constructor(private readonly configService: ConfigService) {}

  toItemDto(entry: LibraryEntryQueryResult): LibraryItemDto {
    const coverUrl = mangaCoverUrl(
      entry.manga.id,
      entry.manga.coverAsset,
      this.configService.get<string>('MEDIA_API_ORIGIN'),
    );

    return {
      manga: {
        id: entry.manga.id,
        slug: entry.manga.slug,
        title: entry.manga.title,
        type: entry.manga.type,
        cover:
          entry.manga.coverAsset && coverUrl
            ? {
                url: coverUrl,
                width: entry.manga.coverAsset.width,
                height: entry.manga.coverAsset.height,
              }
            : null,
        genres: entry.manga.genres.map((g: { genre: Genre }) => g.genre.name),
      },
      library: {
        status: entry.status,
        isFavorite: entry.isFavorite,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      },
    };
  }

  toResponseDto(
    entries: LibraryEntryQueryResult[],
    stats: LibraryStatsDto,
    totalItems: number,
    page: number,
    pageSize: number,
  ): LibraryListResponseDto {
    return {
      items: entries.map((entry) => this.toItemDto(entry)),
      stats,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }
}
