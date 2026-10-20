import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ListSortOption {
  RECENT = 'recent',
  NAME = 'name',
  COUNT = 'count',
}

export enum ListVisibilityFilter {
  ALL = 'all',
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class ListQueryDto {
  @IsString()
  @MaxLength(80)
  @IsOptional()
  q?: string;

  @IsUUID('7')
  @IsOptional()
  mangaId?: string;

  @IsEnum(ListSortOption)
  @IsOptional()
  sort?: ListSortOption = ListSortOption.RECENT;

  @IsEnum(ListVisibilityFilter)
  @IsOptional()
  visibility?: ListVisibilityFilter = ListVisibilityFilter.ALL;
}

export class ListDetailQueryDto {
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
