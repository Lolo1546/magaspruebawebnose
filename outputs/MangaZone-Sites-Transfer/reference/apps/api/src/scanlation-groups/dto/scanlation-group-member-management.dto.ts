import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  ScanlationGroupMemberStatus,
  ScanlationGroupRole,
} from '../../../generated/prisma/client.js';
import { ScanlationGroupSlugParamDto } from './scanlation-group-param.dto.js';

export class ScanlationGroupMembersQueryDto {
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

export class ScanlationGroupMemberParamsDto extends ScanlationGroupSlugParamDto {
  @IsUUID()
  membershipId!: string;
}

export class ScanlationGroupMemberRoleParamsDto extends ScanlationGroupMemberParamsDto {
  @IsEnum(ScanlationGroupRole)
  role!: ScanlationGroupRole;
}

export class AddScanlationGroupMemberDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof (value as unknown) === 'string'
      ? (value as string).trim()
      : (value as unknown),
  )
  @IsString()
  @Matches(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-])*[a-zA-Z0-9]$/)
  username!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ScanlationGroupRole, { each: true })
  roles!: ScanlationGroupRole[];
}

export interface ManagedScanlationGroupMemberDto {
  id: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
  roles: ScanlationGroupRole[];
  status: ScanlationGroupMemberStatus;
  joinedAt: string;
}

export interface ScanlationGroupMembersResponseDto {
  items: ManagedScanlationGroupMemberDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface ScanlationGroupMemberManagementResponseDto {
  member: ManagedScanlationGroupMemberDto;
}
