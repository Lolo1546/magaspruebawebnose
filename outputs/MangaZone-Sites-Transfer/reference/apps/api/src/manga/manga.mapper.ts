import { Injectable } from '@nestjs/common';
import { MangaCatalogItemDto } from './dto/manga-catalog-response.dto.js';
import { MangaDetailResponseDto } from './dto/manga-detail-response.dto.js';
import { ChapterIndexItemDto } from './dto/chapter-index-response.dto.js';
import { ReaderPageDto, ReaderResponseDto } from './dto/reader-response.dto.js';
import { generateReaderKey } from './utils/chapter.utils.js';
import {
  getReadableReaderPages,
  type ReaderMediaPolicy,
} from './utils/reader-asset.utils.js';
import { Genre, Prisma } from '../../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';
import { mangaCoverUrl } from '../storage/manga-cover-url.js';
import { isFinalThumbnailKey } from '../storage/storage-key.js';
import {
  THUMBNAIL_CONTENT_TYPES,
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_MAX_PIXELS,
} from '../editorial/editorial-thumbnail.policy.js';

type MangaQueryResult = Prisma.MangaGetPayload<{
  include: {
    coverAsset: true;
    genres: { include: { genre: true } };
    _count: { select: { libraryEntries: true } };
    chapters: {
      where: { status: 'ACTIVE'; releases: { some: { status: 'PUBLISHED' } } };
      orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }];
      take: 1;
      select: { number: true };
    };
  };
}>;

export type MangaDetailQueryResult = Prisma.MangaGetPayload<{
  include: {
    coverAsset: true;
    genres: { include: { genre: true } };
    aliases: true;
    creators: { include: { creator: true } };
    _count: { select: { libraryEntries: true } };
  };
}>;

export type ChapterIndexQueryResult = Prisma.ChapterGetPayload<{
  include: {
    thumbnailAsset: {
      include: { uploadIntent: true };
    };
    releases: {
      include: {
        groups: { include: { group: true } };
        publishingGroup: { select: { slug: true; name: true } };
      };
    };
  };
}>;

export type ReaderQueryResult = {
  manga: Prisma.MangaGetPayload<{
    select: { id: true; slug: true; title: true };
  }>;
  chapter: Prisma.ChapterGetPayload<{
    select: {
      id: true;
      kind: true;
      number: true;
      displayLabel: true;
      title: true;
      sortOrder: true;
    };
  }>;
  selectedRelease: Prisma.ChapterReleaseGetPayload<{
    include: {
      groups: { include: { group: true } };
      publishingGroup: { select: { slug: true; name: true } };
      pages: { include: { asset: true } };
    };
  }>;
  availableReleases: Prisma.ChapterReleaseGetPayload<{
    include: {
      groups: { include: { group: true } };
      publishingGroup: { select: { slug: true; name: true } };
      pages: { include: { asset: true } };
    };
  }>[];
  mediaPolicy: ReaderMediaPolicy;
  navigation: {
    previous: Prisma.ChapterGetPayload<{
      select: { id: true; kind: true; number: true; displayLabel: true };
    }> | null;
    next: Prisma.ChapterGetPayload<{
      select: { id: true; kind: true; number: true; displayLabel: true };
    }> | null;
  };
};

@Injectable()
export class MangaMapper {
  constructor(private readonly configService: ConfigService) {}

  toCatalogItemDto(
    manga: MangaQueryResult,
    averageScore: number | null,
  ): MangaCatalogItemDto {
    const coverUrl = mangaCoverUrl(
      manga.id,
      manga.coverAsset,
      this.configService.get<string>('MEDIA_API_ORIGIN'),
    );

    let latestChapter = null;
    if (manga.chapters && manga.chapters.length > 0) {
      const num = manga.chapters[0].number;
      latestChapter = num ? num.toNumber() : null;
    }

    return {
      slug: manga.slug,
      title: manga.title,
      type: manga.type,
      demography: manga.demography,
      status: manga.status,
      publicationYear: manga.publicationYear,
      cover:
        manga.coverAsset && coverUrl
          ? {
              url: coverUrl,
              width: manga.coverAsset.width,
              height: manga.coverAsset.height,
            }
          : null,
      genres: manga.genres.map((g: { genre: Genre }) => g.genre.name), // UI uses names right now (Acción, Aventura)
      popularity: manga._count?.libraryEntries ?? 0,
      averageScore,
      latestChapter,
    };
  }

  toDetailDto(
    manga: MangaDetailQueryResult,
    averageScore: number | null,
    reviewCount: number,
  ): MangaDetailResponseDto {
    const coverUrl = mangaCoverUrl(
      manga.id,
      manga.coverAsset,
      this.configService.get<string>('MEDIA_API_ORIGIN'),
    );

    return {
      id: manga.id,
      slug: manga.slug,
      title: manga.title,
      originalTitle: manga.originalTitle,
      description: manga.description,
      type: manga.type,
      demography: manga.demography,
      status: manga.status,
      publicationYear: manga.publicationYear,
      contentRating: manga.contentRating,
      cover:
        manga.coverAsset && coverUrl
          ? {
              url: coverUrl,
              width: manga.coverAsset.width,
              height: manga.coverAsset.height,
            }
          : null,
      aliases: manga.aliases.map((a) => a.alias),
      genres: manga.genres.map((g) => ({
        slug: g.genre.slug,
        name: g.genre.name,
      })),
      creators: manga.creators.map((c) => ({
        name: c.creator.name,
        role: c.contributionType,
      })),
      stats: {
        popularity: manga._count?.libraryEntries ?? 0,
        averageScore,
        reviewCount,
      },
    };
  }

  toChapterIndexItemDto(chapter: ChapterIndexQueryResult): ChapterIndexItemDto {
    // Filter out unpublished releases if any slipped through (should be filtered in query)
    const publishedReleases = chapter.releases.filter(
      (r) => r.status === 'PUBLISHED',
    );

    // Find max publishedAt
    let maxPublishedAt: Date | null = null;
    for (const r of publishedReleases) {
      if (
        r.publishedAt &&
        (!maxPublishedAt || r.publishedAt > maxPublishedAt)
      ) {
        maxPublishedAt = r.publishedAt;
      }
    }

    return {
      id: chapter.id,
      readerKey: generateReaderKey(chapter.kind, chapter.number, chapter.id),
      kind: chapter.kind,
      number: chapter.number ? chapter.number.toNumber() : null,
      displayLabel: chapter.displayLabel,
      sortOrder: chapter.sortOrder.toNumber(),
      title: chapter.title,
      thumbnailUrl:
        chapter.thumbnailAsset?.status === 'READY' &&
        isFinalThumbnailKey(chapter.thumbnailAsset.storageKey) &&
        THUMBNAIL_CONTENT_TYPES.some(
          (type) => type === chapter.thumbnailAsset?.mimeType,
        ) &&
        chapter.thumbnailAsset.sizeBytes > 0n &&
        chapter.thumbnailAsset.sizeBytes <= BigInt(THUMBNAIL_MAX_BYTES) &&
        !!chapter.thumbnailAsset.width &&
        !!chapter.thumbnailAsset.height &&
        chapter.thumbnailAsset.width * chapter.thumbnailAsset.height <=
          THUMBNAIL_MAX_PIXELS &&
        chapter.thumbnailAsset.uploadIntent?.purpose === 'CHAPTER_THUMBNAIL' &&
        chapter.thumbnailAsset.uploadIntent.state === 'FINALIZED' &&
        chapter.thumbnailAsset.uploadIntent.chapterId === chapter.id
          ? `/media/chapters/${chapter.id}/thumbnail`
          : null,
      publishedAt: (maxPublishedAt ?? chapter.createdAt).toISOString(),
      releases: publishedReleases.map((r) => ({
        id: r.id,
        language: r.language,
        publishedAt: (r.publishedAt ?? chapter.createdAt).toISOString(),
        groups: r.publishingGroup
          ? [{ slug: r.publishingGroup.slug, name: r.publishingGroup.name }]
          : r.groups.map((g) => ({ slug: g.group.slug, name: g.group.name })),
      })),
    };
  }

  toReaderResponseDto({
    manga,
    chapter,
    selectedRelease,
    availableReleases,
    mediaPolicy,
    navigation,
  }: ReaderQueryResult): ReaderResponseDto {
    const pages: ReaderPageDto[] = getReadableReaderPages(
      selectedRelease.pages,
      mediaPolicy,
    ).map(({ page, url }, index) => ({
      // `index` is the contiguous 1-based reading position. DB pageNumber is
      // only the ordering key, so gaps such as 1, 2, 5 do not create ghosts.
      index: index + 1,
      url,
      width: page.asset.width ?? 900,
      height: page.asset.height ?? 1300,
    }));

    return {
      manga: {
        id: manga.id,
        slug: manga.slug,
        title: manga.title,
      },
      chapter: {
        id: chapter.id,
        readerKey: generateReaderKey(chapter.kind, chapter.number, chapter.id),
        kind: chapter.kind,
        number: chapter.number ? chapter.number.toNumber() : null,
        displayLabel: chapter.displayLabel,
        title: chapter.title,
        sortOrder: chapter.sortOrder.toNumber(),
      },
      release: {
        id: selectedRelease.id,
        language: selectedRelease.language,
        publishedAt: (
          selectedRelease.publishedAt ?? selectedRelease.createdAt
        ).toISOString(),
        groups: selectedRelease.publishingGroup
          ? [
              {
                slug: selectedRelease.publishingGroup.slug,
                name: selectedRelease.publishingGroup.name,
              },
            ]
          : selectedRelease.groups.map((g) => ({
              slug: g.group.slug,
              name: g.group.name,
            })),
      },
      availableReleases: availableReleases.map((r) => ({
        id: r.id,
        language: r.language,
        publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
        groups: r.publishingGroup
          ? [{ slug: r.publishingGroup.slug, name: r.publishingGroup.name }]
          : r.groups.map((g) => ({ slug: g.group.slug, name: g.group.name })),
      })),
      pages,
      navigation: {
        previous: navigation.previous
          ? {
              readerKey: generateReaderKey(
                navigation.previous.kind,
                navigation.previous.number,
                navigation.previous.id,
              ),
              displayLabel: navigation.previous.displayLabel,
            }
          : null,
        next: navigation.next
          ? {
              readerKey: generateReaderKey(
                navigation.next.kind,
                navigation.next.number,
                navigation.next.id,
              ),
              displayLabel: navigation.next.displayLabel,
            }
          : null,
      },
    };
  }
}
