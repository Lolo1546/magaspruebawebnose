import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CommunityStatus,
  ScanlationGroupStatus,
  UserStatus,
} from '../../../generated/prisma/client.js';
import { GLOBAL_ROLE_KEYS } from '../../authorization/global-role-keys.js';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

class AdminPageQueryDto {
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

export class AdminUsersQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsIn(Object.values(GLOBAL_ROLE_KEYS))
  hasRole?: string;
}

export class AdminCommunitiesQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsEnum(CommunityStatus)
  status?: CommunityStatus;
}

export class AdminScanlationGroupsQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsEnum(ScanlationGroupStatus)
  status?: ScanlationGroupStatus;
}
