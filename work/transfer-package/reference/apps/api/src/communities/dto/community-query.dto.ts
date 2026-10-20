import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum CommunitySort {
  NAME = 'name',
  RECENT = 'recent',
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CommunityQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsEnum(CommunitySort)
  sort: CommunitySort = CommunitySort.NAME;

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
