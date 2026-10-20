import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ContentRating,
  ContributionType,
  MangaEditorialStatus,
  MangaDemography,
  MangaStatus,
  MangaType,
} from '../../../generated/prisma/client.js';
import { normalizeEditorialTitle } from '../editorial-title-normalizer.js';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function nullableTrim({ value }: TransformFnParams): unknown {
  if (value === null || value === undefined) return value;
  return typeof value === 'string' ? value.trim() || null : value;
}

function aliasIdentity(item: unknown): unknown {
  return typeof item === 'object' &&
    item !== null &&
    'alias' in item &&
    typeof item.alias === 'string'
    ? normalizeEditorialTitle(item.alias)
    : item;
}

export class EditorialMangaAliasDto {
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  alias!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 35)
  languageCode?: string;
}

export class EditorialMangaCreatorDto {
  @IsUUID('7')
  creatorId!: string;

  @IsEnum(ContributionType)
  contributionType!: ContributionType;
}

class EditorialMangaMetadataDto {
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(200)
  originalTitle?: string | null;

  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsEnum(MangaType)
  type!: MangaType;

  @IsOptional()
  @IsEnum(MangaDemography)
  demography?: MangaDemography | null;

  @IsEnum(MangaStatus)
  status!: MangaStatus;

  @IsEnum(ContentRating)
  contentRating!: ContentRating;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  publicationYear?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique(aliasIdentity)
  @ValidateNested({ each: true })
  @Type(() => EditorialMangaAliasDto)
  aliases?: EditorialMangaAliasDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('7', { each: true })
  genreIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique(
    (item: EditorialMangaCreatorDto) =>
      `${item.creatorId}:${item.contributionType}`,
  )
  @ValidateNested({ each: true })
  @Type(() => EditorialMangaCreatorDto)
  creators?: EditorialMangaCreatorDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  duplicateOverrideReason?: string;
}

export class CreateEditorialMangaDto extends EditorialMangaMetadataDto {}

export class UpdateEditorialMangaDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(200)
  originalTitle?: string | null;

  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsOptional()
  @IsEnum(MangaType)
  type?: MangaType;

  @IsOptional()
  @IsEnum(MangaDemography)
  demography?: MangaDemography | null;

  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

  @IsOptional()
  @IsEnum(ContentRating)
  contentRating?: ContentRating;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  publicationYear?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique(aliasIdentity)
  @ValidateNested({ each: true })
  @Type(() => EditorialMangaAliasDto)
  aliases?: EditorialMangaAliasDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('7', { each: true })
  genreIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique(
    (item: EditorialMangaCreatorDto) =>
      `${item.creatorId}:${item.contributionType}`,
  )
  @ValidateNested({ each: true })
  @Type(() => EditorialMangaCreatorDto)
  creators?: EditorialMangaCreatorDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  duplicateOverrideReason?: string;
}

export class PublishEditorialMangaDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  duplicateOverrideReason?: string;
}

export class HideEditorialMangaDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export class EditorialMangaParamsDto {
  @IsUUID('7')
  id!: string;
}

export class EditorialMangaQueryDto {
  @IsOptional()
  @IsEnum(MangaDemography)
  demography?: MangaDemography;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsEnum(MangaEditorialStatus)
  editorialStatus?: MangaEditorialStatus;

  @IsOptional()
  @IsEnum(MangaType)
  type?: MangaType;

  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

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
