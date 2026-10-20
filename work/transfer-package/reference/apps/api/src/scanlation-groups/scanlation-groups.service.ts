import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ProjectGroupStatus,
  ScanlationGroupMemberStatus,
  ScanlationGroupStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ScanlationGroupQueryDto,
  ScanlationGroupSort,
} from './dto/scanlation-group-query.dto.js';
import type {
  ScanlationGroupDetailResponseDto,
  ScanlationGroupIndexResponseDto,
} from './dto/scanlation-group-response.dto.js';
import { ScanlationGroupsMapper } from './scanlation-groups.mapper.js';

export const PUBLIC_SCANLATION_GROUP_WHERE = {
  status: ScanlationGroupStatus.VERIFIED,
} satisfies Prisma.ScanlationGroupWhereInput;

const publicGroupInclude = {
  logoAsset: true,
  bannerAsset: true,
  _count: {
    select: {
      members: {
        where: {
          status: ScanlationGroupMemberStatus.ACTIVE,
          leftAt: null,
        },
      },
      releaseParticipations: true,
      projectParticipations: {
        where: {
          status: ProjectGroupStatus.ACTIVE,
          leftAt: null,
        },
      },
    },
  },
} satisfies Prisma.ScanlationGroupInclude;

@Injectable()
export class ScanlationGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ScanlationGroupsMapper,
  ) {}

  async getPublicGroups(
    query: ScanlationGroupQueryDto,
  ): Promise<ScanlationGroupIndexResponseDto> {
    const where: Prisma.ScanlationGroupWhereInput = {
      ...PUBLIC_SCANLATION_GROUP_WHERE,
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { nameNormalized: { contains: query.q.toUpperCase() } },
        ],
      }),
      ...(query.language && {
        language: { equals: query.language, mode: 'insensitive' },
      }),
    };
    const orderBy: Prisma.ScanlationGroupOrderByWithRelationInput[] =
      query.sort === ScanlationGroupSort.RECENT
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ nameNormalized: 'asc' }, { id: 'asc' }];

    const [total, groups] = await this.prisma.$transaction([
      this.prisma.scanlationGroup.count({ where }),
      this.prisma.scanlationGroup.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: publicGroupInclude,
      }),
    ]);

    return {
      items: groups.map((group) => this.mapper.toIndexItem(group)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async getPublicGroupBySlug(
    slug: string,
  ): Promise<ScanlationGroupDetailResponseDto> {
    const group = await this.prisma.scanlationGroup.findFirst({
      where: { ...PUBLIC_SCANLATION_GROUP_WHERE, slug },
      include: publicGroupInclude,
    });

    if (!group) {
      throw new NotFoundException('Grupo de scanlation no encontrado');
    }

    return this.mapper.toDetail(group);
  }
}
