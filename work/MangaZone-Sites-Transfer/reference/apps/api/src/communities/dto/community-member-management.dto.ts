import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from '../../../generated/prisma/client.js';
import { CommunitySlugParamDto } from './community-param.dto.js';
import type { CommunityPaginationDto } from './community-response.dto.js';

export class CommunityMembersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}

export class CommunityMemberParamsDto extends CommunitySlugParamDto {
  @IsUUID()
  membershipId!: string;
}

export class ChangeCommunityMemberRoleDto {
  @IsEnum(CommunityMemberRole)
  role!: CommunityMemberRole;
}

export interface ManagedCommunityMemberDto {
  id: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: string;
}

export interface CommunityMembersResponseDto {
  items: ManagedCommunityMemberDto[];
  pagination: CommunityPaginationDto;
}

export interface CommunityMemberManagementResponseDto {
  member: ManagedCommunityMemberDto;
}
