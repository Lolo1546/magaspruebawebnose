import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client.js';
import { mangaCoverUrl } from '../storage/manga-cover-url.js';
import {
  ListResponseDto,
  ListPreviewMangaDto,
} from './dto/list-response.dto.js';
import { ListDetailResponseDto } from './dto/list-detail-response.dto.js';

export type UserListQueryResult = Prisma.UserListGetPayload<{
  include: {
    _count: { select: { items: true } };
    items: {
      orderBy: { addedAt: 'desc' };
      take: 4;
      include: {
        manga: {
          include: {
            coverAsset: true;
          };
        };
      };
    };
  };
}>;

export type UserListDetailQueryResult = Prisma.UserListGetPayload<{
  include: {
    _count: { select: { items: true } };
  };
}>;

export type UserListItemQueryResult = Prisma.UserListItemGetPayload<{
  include: {
    manga: {
      include: {
        coverAsset: true;
      };
    };
  };
}>;

@Injectable()
export class ListsMapper {
  constructor(private readonly configService: ConfigService) {}

  private mapMangaAsset(
    manga: UserListItemQueryResult['manga'],
  ): string | null {
    return mangaCoverUrl(
      manga.id,
      manga.coverAsset,
      this.configService.get<string>('MEDIA_API_ORIGIN'),
    );
  }

  private mapPreviewManga(
    manga: UserListItemQueryResult['manga'],
  ): ListPreviewMangaDto {
    return {
      id: manga.id,
      slug: manga.slug,
      title: manga.title,
      coverUrl: this.mapMangaAsset(manga),
    };
  }

  mapList(
    list: UserListQueryResult,
    containsManga: boolean = false,
  ): ListResponseDto {
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      visibility: list.visibility,
      itemCount: list._count.items,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      containsManga,
      previewItems: list.items.map((item) => this.mapPreviewManga(item.manga)),
    };
  }

  mapListDetail(
    list: UserListDetailQueryResult,
    items: UserListItemQueryResult[],
    page: number,
    pageSize: number,
  ): ListDetailResponseDto {
    const total = list._count.items;

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      visibility: list.visibility,
      itemCount: total,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      containsManga: false,
      items: items.map((item) => ({
        manga: this.mapPreviewManga(item.manga),
        addedAt: item.addedAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }
}
