import type {
  CommunityStatus,
  ScanlationGroupStatus,
  UserStatus,
} from '../../../generated/prisma/client.js';

export interface AdminPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface AdminPublicIdentityDto {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AdminUserDto extends AdminPublicIdentityDto {
  status: UserStatus;
  createdAt: string;
  roles: string[];
  directPermissionGrants: string[];
}

export interface AdminUserListDto {
  items: AdminUserDto[];
  pagination: AdminPaginationDto;
}

export interface AdminUserDetailDto {
  user: AdminUserDto;
}

export interface AdminCommunityDto {
  name: string;
  slug: string;
  status: CommunityStatus;
  owner: AdminPublicIdentityDto;
  createdAt: string;
  memberCount: number;
}

export interface AdminCommunityListDto {
  items: AdminCommunityDto[];
  pagination: AdminPaginationDto;
}

export interface AdminCommunityDetailDto {
  community: AdminCommunityDto;
}

export interface AdminScanlationGroupDto {
  name: string;
  slug: string;
  status: ScanlationGroupStatus;
  founder: AdminPublicIdentityDto | null;
  createdAt: string;
  memberCount: number;
}

export interface AdminScanlationGroupListDto {
  items: AdminScanlationGroupDto[];
  pagination: AdminPaginationDto;
}

export interface AdminScanlationGroupDetailDto {
  group: AdminScanlationGroupDto;
}

export interface AdminDashboardDto {
  users: {
    total: number;
    active: number;
    pendingVerification: number;
    suspended: number;
    pendingDeletion: number;
    deleted: number;
  };
  activeCommunities: number;
  verifiedScanlationGroups: number;
  creationRequests: {
    community: { pending: number; needsInfo: number };
    scanlationGroup: { pending: number; needsInfo: number };
    attentionRequired: number;
  };
}
