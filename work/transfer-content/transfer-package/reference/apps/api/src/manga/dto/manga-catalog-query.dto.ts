import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MangaStatus,
  MangaType,
  MangaDemography,
} from '../../../generated/prisma/client.js';

export enum MangaCatalogSort {
  POPULAR = 'popular',
  UPDATED = 'updated',
  TITLE = 'title',
  // score is intentionally omitted as a CONTRACT GAP in 3B.1
}

export class MangaCatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  genre?: string;

  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

  @IsOptional()
  @IsEnum(MangaType)
  type?: MangaType;

  @IsOptional()
  @IsEnum(MangaDemography)
  demography?: MangaDemography;

  @IsOptional()
  @IsEnum(MangaCatalogSort)
  sort?: MangaCatalogSort = MangaCatalogSort.POPULAR;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  pageSize: number = 12;
}
