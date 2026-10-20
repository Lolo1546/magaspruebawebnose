import { Injectable } from '@nestjs/common';
import {
  CommunityRequestStatus,
  CommunityStatus,
  Prisma,
  ScanlationGroupRequestStatus,
  ScanlationGroupStatus,
  UserStatus,
} from '../../generated/prisma/client.js';
import { normalizeAuthUsername } from '../auth/identity/auth-identity-normalizer.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  adminCommunityNotFound,
  adminScanlationGroupNotFound,
  adminUserNotFound,
} from './admin.errors.js';
import {
  AdminMapper,
  adminCommunitySelect,
  adminScanlationGroupSelect,
  adminUserSelect,
} from './admin.mapper.js';
import type {
  AdminCommunitiesQueryDto,
  AdminScanlationGroupsQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-query.dto.js';
import type {
  AdminCommunityDetailDto,
  AdminCommunityListDto,
  AdminDashboardDto,
  AdminScanlationGroupDetailDto,
  AdminScanlationGroupListDto,
  AdminUserDetailDto,
  AdminUserListDto,
} from './dto/admin-response.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: AdminMapper,
  ) {}

  async dashboard(): Promise<AdminDashboardDto> {
    const [
      userStates,
      activeCommunities,
      verifiedGroups,
      communityRequests,
      groupRequests,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.community.count({
        where: { status: CommunityStatus.ACTIVE },
      }),
      this.prisma.scanlationGroup.count({
        where: { status: ScanlationGroupStatus.VERIFIED },
      }),
      this.prisma.communityRequest.groupBy({
        by: ['status'],
        where: {
          status: {
            in: [
              CommunityRequestStatus.PENDING,
              CommunityRequestStatus.NEEDS_INFO,
            ],
          },
        },
        _count: { _all: true },
      }),
      this.prisma.scanlationGroupRequest.groupBy({
        by: ['status'],
        where: {
          status: {
            in: [
              ScanlationGroupRequestStatus.PENDING,
              ScanlationGroupRequestStatus.NEEDS_INFO,
            ],
          },
        },
        _count: { _all: true },
      }),
    ]);
    const userCount = (status: UserStatus) =>
      userStates.find((entry) => entry.status === status)?._count._all ?? 0;
    const requestCount = <Status extends string>(
      rows: Array<{ status: Status; _count: { _all: number } }>,
      status: Status,
    ) => rows.find((entry) => entry.status === status)?._count._all ?? 0;
    const communityPending = requestCount(
      communityRequests,
      CommunityRequestStatus.PENDING,
    );
    const communityNeedsInfo = requestCount(
      communityRequests,
      CommunityRequestStatus.NEEDS_INFO,
    );
    const groupPending = requestCount(
      groupRequests,
      ScanlationGroupRequestStatus.PENDING,
    );
    const groupNeedsInfo = requestCount(
      groupRequests,
      ScanlationGroupRequestStatus.NEEDS_INFO,
    );

    return {
      users: {
        total: userStates.reduce((sum, entry) => sum + entry._count._all, 0),
        active: userCount(UserStatus.ACTIVE),
        pendingVerification: userCount(UserStatus.PENDING_VERIFICATION),
        suspended: userCount(UserStatus.SUSPENDED),
        pendingDeletion: userCount(UserStatus.PENDING_DELETION),
        deleted: userCount(UserStatus.DELETED),
      },
      activeCommunities,
      verifiedScanlationGroups: verifiedGroups,
      creationRequests: {
        community: { pending: communityPending, needsInfo: communityNeedsInfo },
        scanlationGroup: { pending: groupPending, needsInfo: groupNeedsInfo },
        attentionRequired:
          communityPending + communityNeedsInfo + groupPending + groupNeedsInfo,
      },
    };
  }

  async users(query: AdminUsersQueryDto): Promise<AdminUserListDto> {
    const where: Prisma.UserWhereInput = {
      ...(query.search && {
        OR: [
          { username: { contains: query.search, mode: 'insensitive' } },
          {
            profile: {
              displayName: { contains: query.search, mode: 'insensitive' },
            },
          },
        ],
      }),
      ...(query.status && { status: query.status }),
      ...(query.hasRole && {
        roles: { some: { role: { key: query.hasRole } } },
      }),
    };
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: adminUserSelect,
      }),
    ]);
    return {
      items: users.map((user) => this.mapper.user(user)),
      pagination: this.pagination(query.page, query.pageSize, total),
    };
  }

  async user(username: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findFirst({
      where: { usernameNormalized: normalizeAuthUsername(username) },
      select: adminUserSelect,
    });
    if (!user) throw adminUserNotFound();
    return { user: this.mapper.user(user) };
  }

  async communities(
    query: AdminCommunitiesQueryDto,
  ): Promise<AdminCommunityListDto> {
    const where: Prisma.CommunityWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.status && { status: query.status }),
    };
    const [total, communities] = await this.prisma.$transaction([
      this.prisma.community.count({ where }),
      this.prisma.community.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: adminCommunitySelect,
      }),
    ]);
    return {
      items: communities.map((community) => this.mapper.community(community)),
      pagination: this.pagination(query.page, query.pageSize, total),
    };
  }

  async community(slug: string): Promise<AdminCommunityDetailDto> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: adminCommunitySelect,
    });
    if (!community) throw adminCommunityNotFound();
    return { community: this.mapper.community(community) };
  }

  async groups(
    query: AdminScanlationGroupsQueryDto,
  ): Promise<AdminScanlationGroupListDto> {
    const where: Prisma.ScanlationGroupWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.status && { status: query.status }),
    };
    const [total, groups] = await this.prisma.$transaction([
      this.prisma.scanlationGroup.count({ where }),
      this.prisma.scanlationGroup.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: adminScanlationGroupSelect,
      }),
    ]);
    return {
      items: groups.map((group) => this.mapper.group(group)),
      pagination: this.pagination(query.page, query.pageSize, total),
    };
  }

  async group(slug: string): Promise<AdminScanlationGroupDetailDto> {
    const group = await this.prisma.scanlationGroup.findUnique({
      where: { slug },
      select: adminScanlationGroupSelect,
    });
    if (!group) throw adminScanlationGroupNotFound();
    return { group: this.mapper.group(group) };
  }

  private pagination(page: number, pageSize: number, total: number) {
    return {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
