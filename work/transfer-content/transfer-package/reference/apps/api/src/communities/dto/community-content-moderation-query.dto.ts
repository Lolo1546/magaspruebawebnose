import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export enum CommunityModerationContentType {
  POST = 'POST',
  COMMENT = 'COMMENT',
}

export class CommunityContentModerationQueryDto {
  @IsOptional()
  @IsEnum(CommunityModerationContentType)
  type?: CommunityModerationContentType;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 200)
  community?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class CommunityContentModerationParamsDto {
  @IsEnum(CommunityModerationContentType)
  type!: CommunityModerationContentType;

  @IsUUID()
  id!: string;
}
