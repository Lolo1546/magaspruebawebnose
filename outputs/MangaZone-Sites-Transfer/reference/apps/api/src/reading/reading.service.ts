import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { HistoryQueryDto, HistorySort } from './dto/history-query.dto.js';
import { HistoryResponseDto } from './dto/history-response.dto.js';
import { ProgressResponseDto } from './dto/progress-response.dto.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import {
  getReaderMediaPolicy,
  mapHistoryEntry,
  HistoryEntryRaw,
} from './reading.mapper.js';
import {
  getReadableReaderPages,
  isReadableReaderRelease,
} from '../manga/utils/reader-asset.utils.js';

@Injectable()
export class ReadingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async putProgress(
    userId: string,
    mangaId: string,
    dto: UpdateProgressDto,
  ): Promise<ProgressResponseDto> {
    const policy = getReaderMediaPolicy(this.config);
    const now = new Date();

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Validate relationships and readability
      const chapter = await tx.chapter.findUnique({
        where: { id: dto.chapterId },
        select: { mangaId: true, status: true },
      });

      if (
        !chapter ||
        chapter.mangaId !== mangaId ||
        chapter.status !== 'ACTIVE'
      ) {
        throw new NotFoundException(
          `Chapter not found, does not belong to the manga, or is not active`,
        );
      }

      const release = await tx.chapterRelease.findUnique({
        where: { id: dto.chapterReleaseId },
        include: {
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
            orderBy: { pageNumber: 'asc' },
          },
        },
      });

      if (!release || release.chapterId !== dto.chapterId) {
        throw new NotFoundException(
          `Release not found or does not belong to the chapter`,
        );
      }

      if (!isReadableReaderRelease(release, policy)) {
        throw new NotFoundException(
          `Release is unpublished or has no readable pages`,
        );
      }

      const readablePages = getReadableReaderPages(release.pages, policy);

      // 2. Validate requested page and calculate progress
      const positionIndex = readablePages.findIndex(
        (p) => p.page.pageNumber === dto.pageNumber,
      );

      if (positionIndex === -1) {
        throw new BadRequestException(
          `Requested page number is invalid or not readable`,
        );
      }

      const position = positionIndex + 1;
      const pageCount = readablePages.length;
      const progressPercent = Math.round((position / pageCount) * 100);
      const isAtEnd = position === pageCount;

      // 3. Upsert ReadingHistoryEntry (without overwriting completedAt on update)
      await tx.readingHistoryEntry.upsert({
        where: {
          userId_chapterId: {
            userId,
            chapterId: dto.chapterId,
          },
        },
        create: {
          userId,
          mangaId,
          chapterId: dto.chapterId,
          chapterReleaseId: dto.chapterReleaseId,
          lastPageNumber: dto.pageNumber,
          progressPercent,
          firstReadAt: now,
          lastReadAt: now,
          completedAt: null,
        },
        update: {
          chapterReleaseId: dto.chapterReleaseId,
          lastPageNumber: dto.pageNumber,
          progressPercent,
          lastReadAt: now,
        },
      });

      // Conditional completion
      if (isAtEnd) {
        await tx.readingHistoryEntry.updateMany({
          where: {
            userId,
            chapterId: dto.chapterId,
            completedAt: null,
          },
          data: {
            completedAt: now,
          },
        });
      }

      // This separate identity never imports the chapter-level legacy completion.
      // The upsert locks this user/release row until the transaction commits.
      await tx.readingReleaseProgress.upsert({
        where: {
          userId_chapterReleaseId: {
            userId,
            chapterReleaseId: dto.chapterReleaseId,
          },
        },
        create: {
          userId,
          chapterReleaseId: dto.chapterReleaseId,
          pageNumber: dto.pageNumber,
        },
        update: { pageNumber: dto.pageNumber },
      });
      if (isAtEnd) {
        await tx.readingReleaseProgress.updateMany({
          where: {
            userId,
            chapterReleaseId: dto.chapterReleaseId,
            completedAt: null,
          },
          data: { completedAt: now },
        });
      }
      const finalProgress = await tx.readingReleaseProgress.findUniqueOrThrow({
        where: {
          userId_chapterReleaseId: {
            userId,
            chapterReleaseId: dto.chapterReleaseId,
          },
        },
        select: { completedAt: true },
      });

      // 4. Upsert ReadingProgress
      await tx.readingProgress.upsert({
        where: {
          userId_mangaId: {
            userId,
            mangaId,
          },
        },
        create: {
          userId,
          mangaId,
          chapterId: dto.chapterId,
          chapterReleaseId: dto.chapterReleaseId,
          pageNumber: dto.pageNumber,
          progressPercent,
          lastReadAt: now,
        },
        update: {
          chapterId: dto.chapterId,
          chapterReleaseId: dto.chapterReleaseId,
          pageNumber: dto.pageNumber,
          progressPercent,
          lastReadAt: now,
        },
      });

      return {
        mangaId,
        chapterId: dto.chapterId,
        chapterReleaseId: dto.chapterReleaseId,
        pageNumber: dto.pageNumber,
        progressPercent,
        completed: finalProgress.completedAt !== null,
      };
    });
  }

  async getReleaseProgress(userId: string, releaseIds: string[]) {
    const items = await this.prisma.readingReleaseProgress.findMany({
      where: { userId, chapterReleaseId: { in: releaseIds } },
      select: { chapterReleaseId: true, pageNumber: true, completedAt: true },
      orderBy: { chapterReleaseId: 'asc' },
    });
    return {
      items: items.map((item) => ({
        chapterReleaseId: item.chapterReleaseId,
        pageNumber: item.pageNumber,
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
    };
  }

  async getProgress(
    userId: string,
    mangaId: string,
  ): Promise<{ progress: ProgressResponseDto | null }> {
    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_mangaId: {
          userId,
          mangaId,
        },
      },
    });

    if (!progress) {
      return { progress: null };
    }

    return {
      progress: {
        mangaId: progress.mangaId,
        chapterId: progress.chapterId,
        chapterReleaseId: progress.chapterReleaseId,
        pageNumber: progress.pageNumber,
        progressPercent: progress.progressPercent,
      },
    };
  }

  async getHistory(
    userId: string,
    query: HistoryQueryDto,
  ): Promise<HistoryResponseDto> {
    const policy = getReaderMediaPolicy(this.config);

    let where: Prisma.ReadingHistoryEntryWhereInput = { userId };

    if (query.q) {
      // Very basic title search for manga. Case-insensitive mode is standard in Prisma for Postgres `mode: 'insensitive'`
      where = {
        ...where,
        manga: {
          title: { contains: query.q, mode: 'insensitive' },
        },
      };
    }

    if (query.from && query.to && query.from >= query.to) {
      throw new BadRequestException('from must be strictly less than to');
    }

    if (query.from || query.to) {
      where.lastReadAt = {};
      if (query.from) {
        where.lastReadAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.lastReadAt.lt = new Date(query.to);
      }
    }

    const orderBy: Prisma.ReadingHistoryEntryOrderByWithRelationInput[] = [];
    if (query.sort === HistorySort.Oldest) {
      orderBy.push({ lastReadAt: 'asc' });
    } else {
      orderBy.push({ lastReadAt: 'desc' });
    }
    orderBy.push({ id: 'asc' }); // deterministic tie-breaker

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.readingHistoryEntry.count({ where }),
      this.prisma.readingHistoryEntry.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          manga: {
            include: {
              coverAsset: true,
            },
          },
          chapter: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / query.pageSize);

    return {
      items: entries.map((entry: HistoryEntryRaw) =>
        mapHistoryEntry(entry, policy),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
    };
  }
}
