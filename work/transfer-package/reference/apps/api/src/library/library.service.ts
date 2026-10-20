import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LibraryQueryDto } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js';
import { LibraryMapper } from './library.mapper.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: LibraryMapper,
  ) {}

  async getLibrary(userId: string, query: LibraryQueryDto) {
    const { page = 1, pageSize = 20, q, status } = query;

    const where: Prisma.LibraryEntryWhereInput = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.manga = {
        title: {
          contains: q,
          mode: 'insensitive',
        },
      };
    }

    const [entries, totalItems] = await Promise.all([
      this.prisma.libraryEntry.findMany({
        where,
        orderBy: [
          { updatedAt: 'desc' },
          { mangaId: 'asc' }, // deterministic tie-breaker
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          manga: {
            include: {
              coverAsset: true,
              genres: { include: { genre: true } },
            },
          },
        },
      }),
      this.prisma.libraryEntry.count({ where }),
    ]);

    // Fast counters for the UI regardless of search
    // Using group by for performance
    const statsResult = await this.prisma.libraryEntry.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        _all: true,
      },
    });

    const stats = {
      total: 0,
      reading: 0,
      planned: 0,
      completed: 0,
      paused: 0,
      dropped: 0,
    };

    for (const row of statsResult) {
      stats.total += row._count._all;
      switch (row.status) {
        case 'READING':
          stats.reading += row._count._all;
          break;
        case 'PLAN_TO_READ':
          stats.planned += row._count._all;
          break;
        case 'COMPLETED':
          stats.completed += row._count._all;
          break;
        case 'ON_HOLD':
          stats.paused += row._count._all;
          break;
        case 'DROPPED':
          stats.dropped += row._count._all;
          break;
      }
    }

    return this.mapper.toResponseDto(
      entries,
      stats,
      totalItems,
      page,
      pageSize,
    );
  }

  async putEntry(userId: string, mangaId: string, dto: UpdateLibraryEntryDto) {
    // Validate manga exists
    const manga = await this.prisma.manga.findUnique({
      where: { id: mangaId },
      select: { id: true },
    });

    if (!manga) {
      throw new NotFoundException(`Manga with id ${mangaId} not found`);
    }

    const data: Prisma.LibraryEntryUpdateInput = {
      status: dto.status,
      isFavorite: dto.isFavorite,
    };

    await this.prisma.libraryEntry.upsert({
      where: {
        userId_mangaId: {
          userId,
          mangaId,
        },
      },
      update: data,
      create: {
        userId,
        mangaId,
        status: dto.status,
        isFavorite: dto.isFavorite,
      },
    });
  }

  async deleteEntry(userId: string, mangaId: string) {
    try {
      await this.prisma.libraryEntry.delete({
        where: {
          userId_mangaId: {
            userId,
            mangaId,
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          // Record to delete does not exist. Idempotent.
          return;
        }
      }
      throw e;
    }
  }
}
