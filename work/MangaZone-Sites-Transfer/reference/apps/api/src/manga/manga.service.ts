import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  MangaCatalogQueryDto,
  MangaCatalogSort,
} from './dto/manga-catalog-query.dto';
import { MangaCatalogResponseDto } from './dto/manga-catalog-response.dto.js';
import { MangaDetailResponseDto } from './dto/manga-detail-response.dto.js';
import { ChapterIndexQueryDto } from './dto/chapter-index-query.dto.js';
import { ChapterIndexResponseDto } from './dto/chapter-index-response.dto.js';
import { ReaderResponseDto } from './dto/reader-response.dto.js';
import { MangaMapper } from './manga.mapper';
import { isCanonicalNumeric } from './utils/chapter.utils.js';
import {
  isReadableReaderRelease,
  type ReaderMediaPolicy,
} from './utils/reader-asset.utils.js';
import { Prisma } from '../../generated/prisma/client.js';
import { isUUID } from 'class-validator';
import { normalizeEditorialTitle } from '../editorial/editorial-title-normalizer.js';
import { publicReadableReleaseSql } from './utils/public-readable-release.sql.js';

import { publicMangaWhere } from './utils/public-manga.utils.js';

@Injectable()
export class MangaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: MangaMapper,
    private readonly configService: ConfigService,
  ) {}

  private getReaderMediaPolicy(): ReaderMediaPolicy {
    return {
      mediaApiOrigin: this.configService.get<string>('MEDIA_API_ORIGIN'),
      objectStorageBucket: this.configService.get<string>(
        'OBJECT_STORAGE_BUCKET',
      ),
      objectStorageEndpoint: this.configService.get<string>(
        'OBJECT_STORAGE_ENDPOINT',
      ),
    };
  }

  async getCatalog(
    query: MangaCatalogQueryDto,
  ): Promise<MangaCatalogResponseDto> {
    const { q, genre, status, type, sort, page, pageSize } = query;

    const where: Prisma.MangaWhereInput = { ...publicMangaWhere };
    if (query.demography) where.demography = query.demography;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        {
          aliases: {
            some: {
              normalizedAlias: { contains: normalizeEditorialTitle(q) },
            },
          },
        },
      ];
    }
    if (genre) {
      // Frontend is sending Spanish labels (Acción, Aventura, etc.) or "all"
      // Wait, frontend adapter converts it before calling API, but wait: the prompt said "usar slug/identifier canónico que soporte schema real".
      // Let me just query by name, but actually, if genre is a slug, we should query by slug.
      // Wait, if I'm not supposed to change the frontend yet to slugs (the prompt said "Las opciones de filtros actuales pueden seguir siendo static product config, mantenerlas").
      // Actually, I can map the frontend Spanish name to slug in the frontend adapter, or I can just use name here since explore.ts uses "genres: ["Acción", "Fantasía"]".
      // Let's use name. The prompt also says "usar slug/identifier canónico que soporte schema real". Oh!
      // So I should map it to slug. Let's just query by slug here, and the frontend will map the Spanish label to slug.
      where.genres = { some: { genre: { slug: genre } } };
    }
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    let orderBy: Prisma.MangaOrderByWithRelationInput[] = [];
    if (sort === MangaCatalogSort.POPULAR) {
      orderBy = [
        { libraryEntries: { _count: 'desc' } },
        { title: 'asc' },
        { id: 'asc' },
      ];
    } else if (sort === MangaCatalogSort.TITLE) {
      orderBy = [{ title: 'asc' }, { id: 'asc' }];
    } else if (sort === MangaCatalogSort.UPDATED) {
      orderBy = [{ createdAt: 'desc' }, { title: 'asc' }, { id: 'asc' }];
    } else {
      orderBy = [
        { libraryEntries: { _count: 'desc' } },
        { title: 'asc' },
        { id: 'asc' },
      ]; // fallback
    }

    const skip = (page - 1) * pageSize;

    const [total, mangas] = await this.prisma.$transaction([
      this.prisma.manga.count({ where }),
      this.prisma.manga.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          coverAsset: true,
          genres: { include: { genre: true } },
          _count: { select: { libraryEntries: true } },
          chapters: {
            where: {
              status: 'ACTIVE',
              releases: { some: { status: 'PUBLISHED' } },
            },
            orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { number: true },
          },
        },
      }),
    ]);

    const mangaIds = mangas.map((m) => m.id);
    const scoreMap = new Map<string, number>();

    if (mangaIds.length > 0) {
      const groupedReviews = await this.prisma.review.groupBy({
        by: ['mangaId'],
        where: {
          mangaId: { in: mangaIds },
          status: 'PUBLISHED',
        },
        _avg: {
          score: true,
        },
      });

      for (const group of groupedReviews) {
        if (group._avg.score !== null) {
          scoreMap.set(
            group.mangaId,
            Number(Number(group._avg.score).toFixed(1)),
          );
        }
      }
    }

    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: mangas.map((m) =>
        this.mapper.toCatalogItemDto(m, scoreMap.get(m.id) ?? null),
      ),
      pagination: {
        page,
        pageSize,
        total,
        pageCount,
      },
    };
  }

  async getMangaBySlug(slug: string): Promise<MangaDetailResponseDto> {
    const manga = await this.prisma.manga.findFirst({
      where: { slug, ...publicMangaWhere },
      include: {
        coverAsset: true,
        genres: { include: { genre: true } },
        aliases: true,
        creators: { include: { creator: true } },
        _count: { select: { libraryEntries: true } },
      },
    });

    if (!manga) {
      throw new NotFoundException(`Manga with slug ${slug} not found`);
    }

    const reviewStats = await this.prisma.review.aggregate({
      where: {
        mangaId: manga.id,
        status: 'PUBLISHED',
      },
      _avg: {
        score: true,
      },
      _count: {
        id: true,
      },
    });

    let averageScore = null;
    if (reviewStats._avg.score !== null) {
      averageScore = Number(Number(reviewStats._avg.score).toFixed(1));
    }

    return this.mapper.toDetailDto(manga, averageScore, reviewStats._count.id);
  }

  async getChapterIndex(
    slug: string,
    query: ChapterIndexQueryDto,
  ): Promise<ChapterIndexResponseDto> {
    const { page = 1, pageSize = 20, sort = 'desc' } = query;
    const search = query.q?.trim();
    const group = query.group?.trim();

    const manga = await this.prisma.manga.findFirst({
      where: { slug, ...publicMangaWhere },
      select: { id: true },
    });

    if (!manga) {
      throw new NotFoundException(`Manga with slug ${slug} not found`);
    }

    const readableRelease = publicReadableReleaseSql(
      this.getReaderMediaPolicy(),
    );
    const searchClause = search
      ? Prisma.sql`AND (
      strpos(lower(c."displayLabel"), lower(${search})) > 0 OR
      strpos(lower(coalesce(c."title", '')), lower(${search})) > 0
    )`
      : Prisma.empty;
    const groupClause = group
      ? Prisma.sql`AND EXISTS (
      SELECT 1 FROM "ChapterRelease" r WHERE r."chapterId" = c."id"
      AND ${readableRelease} AND (
        EXISTS (SELECT 1 FROM "ScanlationGroup" sg WHERE sg."id" = r."publishingGroupId" AND sg."slug" = ${group})
        OR (r."publishingGroupId" IS NULL AND EXISTS (
          SELECT 1 FROM "ChapterReleaseGroup" rg JOIN "ScanlationGroup" sg ON sg."id" = rg."groupId"
          WHERE rg."chapterReleaseId" = r."id" AND sg."slug" = ${group}
        ))
      )
    )`
      : Prisma.empty;
    const eligibleChapter = Prisma.sql`c."mangaId" = ${manga.id}::uuid AND c."status" = 'ACTIVE'
      AND EXISTS (SELECT 1 FROM "ChapterRelease" r WHERE r."chapterId" = c."id" AND ${readableRelease})
      ${searchClause} ${groupClause}`;
    const skip = (page - 1) * pageSize;
    const direction = sort === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const [countRows, chapterIds, groups] = await Promise.all([
      this.prisma.$queryRaw<
        { total: bigint }[]
      >`SELECT count(*)::bigint AS total FROM "Chapter" c WHERE ${eligibleChapter}`,
      this.prisma.$queryRaw<
        { id: string }[]
      >`SELECT c."id" FROM "Chapter" c WHERE ${eligibleChapter}
        ORDER BY c."sortOrder" ${direction}, c."id" ${direction}
        LIMIT ${pageSize} OFFSET ${skip}`,
      this.prisma.$queryRaw<
        { slug: string; name: string }[]
      >`SELECT DISTINCT sg."slug", sg."name"
        FROM "ScanlationGroup" sg JOIN "ChapterRelease" r ON (
          r."publishingGroupId" = sg."id" OR (r."publishingGroupId" IS NULL AND EXISTS (
            SELECT 1 FROM "ChapterReleaseGroup" rg WHERE rg."chapterReleaseId" = r."id" AND rg."groupId" = sg."id"
          ))) JOIN "Chapter" c ON c."id" = r."chapterId"
        WHERE c."mangaId" = ${manga.id}::uuid AND c."status" = 'ACTIVE' AND ${readableRelease}
        ORDER BY sg."name" ASC, sg."slug" ASC`,
    ]);
    const selectedIds = chapterIds.map((chapter) => chapter.id);
    const releaseIds = selectedIds.length
      ? await this.prisma.$queryRaw<
          { id: string }[]
        >`SELECT r."id" FROM "ChapterRelease" r
          WHERE r."chapterId" IN (${Prisma.join(selectedIds)} ) AND ${readableRelease}`
      : [];
    const chapters = selectedIds.length
      ? await this.prisma.chapter.findMany({
          where: { id: { in: selectedIds } },
          orderBy: [{ sortOrder: sort }, { id: sort }],
          include: {
            thumbnailAsset: { include: { uploadIntent: true } },
            releases: {
              where: { id: { in: releaseIds.map((release) => release.id) } },
              orderBy: [
                { publishedAt: { sort: 'asc', nulls: 'last' } },
                { id: 'asc' },
              ],
              include: {
                groups: { include: { group: true } },
                publishingGroup: { select: { slug: true, name: true } },
              },
            },
          },
        })
      : [];

    const count = Number(countRows[0]?.total ?? 0n);
    const pageCount = Math.max(1, Math.ceil(count / pageSize));

    return {
      items: chapters.map((c) => this.mapper.toChapterIndexItemDto(c)),
      pagination: {
        page,
        pageSize,
        total: count,
        pageCount,
      },
      groups,
    };
  }

  async getReaderData(
    slug: string,
    chapterKey: string,
    releaseId?: string,
  ): Promise<ReaderResponseDto> {
    const manga = await this.prisma.manga.findFirst({
      where: { slug, ...publicMangaWhere },
      select: { id: true, slug: true, title: true },
    });

    if (!manga) {
      throw new NotFoundException(`Manga with slug ${slug} not found`);
    }

    let chapterWhere: Prisma.ChapterWhereInput;
    if (isCanonicalNumeric(chapterKey)) {
      chapterWhere = {
        mangaId: manga.id,
        kind: 'REGULAR',
        number: new Prisma.Decimal(chapterKey),
      };
    } else {
      if (!isUUID(chapterKey, '7')) {
        throw new NotFoundException(`Chapter with key ${chapterKey} not found`);
      }
      chapterWhere = {
        mangaId: manga.id,
        id: chapterKey,
      };
    }

    const chapter = await this.prisma.chapter.findFirst({
      where: {
        ...chapterWhere,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        kind: true,
        number: true,
        displayLabel: true,
        title: true,
        sortOrder: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter not found`);
    }

    const mediaPolicy = this.getReaderMediaPolicy();
    const releaseCandidates = await this.prisma.chapterRelease.findMany({
      where: {
        chapterId: chapter.id,
        status: 'PUBLISHED',
        pages: {
          some: {
            asset: { status: 'READY' },
          },
        },
      },
      // TEMPORARY DEFAULT RELEASE POLICY: newest non-null publication first;
      // null publication dates are last, then UUID descending for stable ties.
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      include: {
        groups: { include: { group: true } },
        publishingGroup: { select: { slug: true, name: true } },
        pages: {
          include: {
            asset: {
              include: {
                uploadIntent: {
                  select: { purpose: true, state: true, releaseId: true },
                },
              },
            },
          },
        },
      },
    });

    const availableReleases = releaseCandidates.filter((release) =>
      isReadableReaderRelease(release, mediaPolicy),
    );

    const defaultRelease = availableReleases[0];
    if (!defaultRelease) {
      throw new NotFoundException(`No readable releases found for chapter`);
    }

    let selectedRelease = defaultRelease;
    if (releaseId) {
      const explicit = availableReleases.find((r) => r.id === releaseId);
      if (!explicit) {
        throw new NotFoundException(
          `Explicit release not found or not readable`,
        );
      }
      selectedRelease = explicit;
    }

    const navigationCandidates = await this.prisma.chapter.findMany({
      where: {
        mangaId: manga.id,
        status: 'ACTIVE',
        releases: {
          some: {
            status: 'PUBLISHED',
            pages: { some: { asset: { status: 'READY' } } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        kind: true,
        number: true,
        displayLabel: true,
        sortOrder: true,
        releases: {
          where: {
            status: 'PUBLISHED',
            pages: { some: { asset: { status: 'READY' } } },
          },
          select: {
            status: true,
            pages: {
              where: { asset: { status: 'READY' } },
              select: {
                id: true,
                chapterReleaseId: true,
                pageNumber: true,
                asset: {
                  select: {
                    status: true,
                    storageKey: true,
                    mimeType: true,
                    uploadIntent: {
                      select: { purpose: true, state: true, releaseId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const readableNavigation = navigationCandidates.filter((candidate) =>
      candidate.releases.some((release) =>
        isReadableReaderRelease(release, mediaPolicy),
      ),
    );
    const previousChapter = readableNavigation
      .filter((candidate) => candidate.sortOrder.lt(chapter.sortOrder))
      .at(-1);
    const nextChapter = readableNavigation.find((candidate) =>
      candidate.sortOrder.gt(chapter.sortOrder),
    );

    return this.mapper.toReaderResponseDto({
      manga,
      chapter,
      selectedRelease,
      availableReleases,
      mediaPolicy,
      navigation: {
        previous: previousChapter ?? null,
        next: nextChapter ?? null,
      },
    });
  }
}
