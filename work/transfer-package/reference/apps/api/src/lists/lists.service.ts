import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListsMapper } from './lists.mapper.js';
import { CreateListDto } from './dto/create-list.dto.js';
import { UpdateListDto } from './dto/update-list.dto.js';
import { ListQueryDto, ListSortOption } from './dto/list-query.dto.js';
import { ListDetailQueryDto } from './dto/list-query.dto.js';
import { Prisma, ListVisibility } from '../../generated/prisma/client.js';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ListsMapper,
  ) {}

  async getUserLists(userId: string, query: ListQueryDto) {
    const where: Prisma.UserListWhereInput = {
      userId,
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
      ...(query.visibility &&
        query.visibility !== ('all' as any) && {
          visibility: query.visibility.toUpperCase() as ListVisibility,
        }),
    };

    let orderBy: Prisma.UserListOrderByWithRelationInput;
    if (query.sort === ListSortOption.NAME) {
      orderBy = { name: 'asc' };
    } else if (query.sort === ListSortOption.COUNT) {
      orderBy = { items: { _count: 'desc' } };
    } else {
      orderBy = { updatedAt: 'desc' };
    }

    const lists = await this.prisma.userList.findMany({
      where,
      orderBy,
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { addedAt: 'desc' },
          take: 4,
          include: {
            manga: {
              include: {
                coverAsset: true,
              },
            },
          },
        },
      },
    });

    const membershipMap = new Set<string>();
    if (query.mangaId && lists.length > 0) {
      const memberships = await this.prisma.userListItem.findMany({
        where: {
          listId: { in: lists.map((l) => l.id) },
          mangaId: query.mangaId,
        },
        select: { listId: true },
      });
      memberships.forEach((m) => membershipMap.add(m.listId));
    }

    return lists.map((list) =>
      this.mapper.mapList(list, membershipMap.has(list.id)),
    );
  }

  async getListDetail(
    userId: string,
    listId: string,
    query: ListDetailQueryDto,
  ) {
    const list = await this.prisma.userList.findUnique({
      where: { id: listId, userId },
      include: {
        _count: { select: { items: true } },
      },
    });

    if (!list) {
      throw new NotFoundException('Lista no encontrada');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const items = await this.prisma.userListItem.findMany({
      where: { listId },
      orderBy: [{ position: 'asc' }, { addedAt: 'asc' }, { mangaId: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        manga: {
          include: {
            coverAsset: true,
          },
        },
      },
    });

    return this.mapper.mapListDetail(list, items, page, pageSize);
  }

  async createList(userId: string, dto: CreateListDto) {
    const list = await this.prisma.userList.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        visibility: dto.visibility ?? 'PRIVATE',
      },
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { addedAt: 'desc' },
          take: 4,
          include: {
            manga: {
              include: {
                coverAsset: true,
              },
            },
          },
        },
      },
    });

    return this.mapper.mapList(list);
  }

  async updateList(userId: string, listId: string, dto: UpdateListDto) {
    const count = await this.prisma.userList.count({
      where: { id: listId, userId },
    });

    if (count === 0) {
      throw new NotFoundException('Lista no encontrada');
    }

    const updated = await this.prisma.userList.update({
      where: { id: listId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      },
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { addedAt: 'desc' },
          take: 4,
          include: {
            manga: {
              include: {
                coverAsset: true,
              },
            },
          },
        },
      },
    });

    return this.mapper.mapList(updated);
  }

  async deleteList(userId: string, listId: string) {
    const count = await this.prisma.userList.count({
      where: { id: listId, userId },
    });

    if (count === 0) {
      throw new NotFoundException('Lista no encontrada');
    }

    await this.prisma.userList.delete({
      where: { id: listId },
    });
  }

  async addListItem(userId: string, listId: string, mangaId: string) {
    const listCount = await this.prisma.userList.count({
      where: { id: listId, userId },
    });

    if (listCount === 0) {
      throw new NotFoundException('Lista no encontrada');
    }

    const mangaCount = await this.prisma.manga.count({
      where: { id: mangaId },
    });

    if (mangaCount === 0) {
      throw new NotFoundException('Manga no encontrado');
    }

    // Attempt to aggregate the max position safely
    const aggregate = await this.prisma.userListItem.aggregate({
      where: { listId },
      _max: { position: true },
    });

    const nextPosition = (aggregate._max.position ?? 0) + 1;

    // We use upsert to make this safe for duplicate requests. If it exists, it won't throw or alter position
    await this.prisma.userListItem.upsert({
      where: { listId_mangaId: { listId, mangaId } },
      create: {
        listId,
        mangaId,
        position: nextPosition,
      },
      update: {}, // No-op
    });
  }

  async removeListItem(userId: string, listId: string, mangaId: string) {
    const listCount = await this.prisma.userList.count({
      where: { id: listId, userId },
    });

    if (listCount === 0) {
      throw new NotFoundException('Lista no encontrada');
    }

    try {
      await this.prisma.userListItem.delete({
        where: { listId_mangaId: { listId, mangaId } },
      });
    } catch (e: unknown) {
      // Prisma throws a RecordNotFound error (P2025) if it doesn't exist.
      // We want this to be idempotent, so we ignore it.
      if ((e as { code?: string }).code !== 'P2025') {
        throw e;
      }
    }
  }
}
