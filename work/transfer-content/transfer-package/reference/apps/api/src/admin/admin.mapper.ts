import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetStatus,
  CommunityMemberStatus,
  Prisma,
  ScanlationGroupMemberStatus,
  ScanlationGroupRole,
} from '../../generated/prisma/client.js';
import { resolveReaderAssetUrl } from '../manga/utils/reader-asset.utils.js';
import type {
  AdminCommunityDto,
  AdminPublicIdentityDto,
  AdminScanlationGroupDto,
  AdminUserDto,
} from './dto/admin-response.dto.js';

const safeIdentitySelect = {
  username: true,
  profile: {
    select: {
      displayName: true,
      avatarAsset: { select: { status: true, storageKey: true } },
    },
  },
} satisfies Prisma.UserSelect;

export const adminUserSelect = {
  username: true,
  status: true,
  createdAt: true,
  profile: safeIdentitySelect.profile,
  roles: {
    select: { role: { select: { key: true } } },
  },
  permissionGrants: {
    select: { permission: { select: { key: true } } },
  },
} satisfies Prisma.UserSelect;

export const adminCommunitySelect = {
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  owner: { select: safeIdentitySelect },
  _count: {
    select: {
      members: {
        where: { status: CommunityMemberStatus.ACTIVE, leftAt: null },
      },
    },
  },
} satisfies Prisma.CommunitySelect;

export const adminScanlationGroupSelect = {
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  members: {
    where: {
      status: ScanlationGroupMemberStatus.ACTIVE,
      leftAt: null,
      roles: { some: { role: ScanlationGroupRole.FOUNDER } },
    },
    orderBy: [{ joinedAt: 'asc' as const }, { id: 'asc' as const }],
    take: 1,
    select: { user: { select: safeIdentitySelect } },
  },
  _count: {
    select: {
      members: {
        where: { status: ScanlationGroupMemberStatus.ACTIVE, leftAt: null },
      },
    },
  },
} satisfies Prisma.ScanlationGroupSelect;

export type AdminUserProjection = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;
export type AdminCommunityProjection = Prisma.CommunityGetPayload<{
  select: typeof adminCommunitySelect;
}>;
export type AdminScanlationGroupProjection = Prisma.ScanlationGroupGetPayload<{
  select: typeof adminScanlationGroupSelect;
}>;

type AdminIdentityProjection = AdminCommunityProjection['owner'];

@Injectable()
export class AdminMapper {
  constructor(private readonly config: ConfigService) {}

  private identity(user: AdminIdentityProjection): AdminPublicIdentityDto {
    const asset = user.profile?.avatarAsset;
    return {
      username: user.username,
      displayName: user.profile?.displayName ?? null,
      avatarUrl:
        asset?.status === AssetStatus.READY
          ? resolveReaderAssetUrl(asset.storageKey, {
              objectStorageBucket: this.config.get<string>(
                'OBJECT_STORAGE_BUCKET',
              ),
              objectStorageEndpoint: this.config.get<string>(
                'OBJECT_STORAGE_ENDPOINT',
              ),
            })
          : null,
    };
  }

  user(user: AdminUserProjection): AdminUserDto {
    return {
      ...this.identity(user),
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      roles: user.roles.map(({ role }) => role.key).sort(),
      directPermissionGrants: user.permissionGrants
        .map(({ permission }) => permission.key)
        .sort(),
    };
  }

  community(community: AdminCommunityProjection): AdminCommunityDto {
    return {
      name: community.name,
      slug: community.slug,
      status: community.status,
      owner: this.identity(community.owner),
      createdAt: community.createdAt.toISOString(),
      memberCount: community._count.members,
    };
  }

  group(group: AdminScanlationGroupProjection): AdminScanlationGroupDto {
    return {
      name: group.name,
      slug: group.slug,
      status: group.status,
      founder: group.members[0] ? this.identity(group.members[0].user) : null,
      createdAt: group.createdAt.toISOString(),
      memberCount: group._count.members,
    };
  }
}
