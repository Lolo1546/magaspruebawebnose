import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum HistorySort {
  Recent = 'recent',
  Oldest = 'oldest',
}

export class HistoryQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(HistorySort)
  sort: HistorySort = HistorySort.Recent;

  @IsOptional()
  @IsISO8601()
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message:
      'Date must be an absolute instant with explicit timezone (Z or ±HH:mm)',
  })
  from?: string;

  @IsOptional()
  @IsISO8601()
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message:
      'Date must be an absolute instant with explicit timezone (Z or ±HH:mm)',
  })
  to?: string;

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
