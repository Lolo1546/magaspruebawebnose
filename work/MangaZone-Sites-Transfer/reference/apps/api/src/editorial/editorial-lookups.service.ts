import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EditorialAuthorizationService } from './editorial-authorization.service.js';
import type { EditorialLookupQueryDto } from './dto/editorial-lookup-query.dto.js';

@Injectable()
export class EditorialLookupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: EditorialAuthorizationService,
  ) {}

  async genres(actorUserId: string, query: EditorialLookupQueryDto) {
    await this.authorization.assertCatalogManager(actorUserId);
    const where = query.q
      ? { name: { contains: query.q, mode: 'insensitive' as const } }
      : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.genre.count({ where }),
      this.prisma.genre.findMany({
        where,
        select: { id: true, name: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items, pagination: this.pagination(query, total) };
  }

  async creators(actorUserId: string, query: EditorialLookupQueryDto) {
    await this.authorization.assertCatalogManager(actorUserId);
    const where = query.q
      ? { name: { contains: query.q, mode: 'insensitive' as const } }
      : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.creator.count({ where }),
      this.prisma.creator.findMany({
        where,
        select: { id: true, name: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items, pagination: this.pagination(query, total) };
  }

  private pagination(query: EditorialLookupQueryDto, total: number) {
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
}
