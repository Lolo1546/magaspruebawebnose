import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { ChapterKind } from '../../../generated/prisma/client.js';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Decimal(12,4): strings preserve precision and reject implicit DB rounding.
const chapterDecimal = /^\d{1,8}(?:\.\d{1,4})?$/;

@ValidatorConstraint({ name: 'editorialLanguage', async: false })
export class EditorialLanguageConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      return Intl.getCanonicalLocales(value).length === 1;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'language must be a well-formed supported BCP-47 language tag';
  }
}

export class EditorialChapterProjectParamsDto {
  @IsUUID('7')
  projectId!: string;
}

export class EditorialChapterParamsDto extends EditorialChapterProjectParamsDto {
  @IsUUID('7')
  chapterId!: string;
}

export class EditorialReleaseParamsDto extends EditorialChapterParamsDto {
  @IsUUID('7')
  releaseId!: string;
}

export class CreateEditorialChapterDto {
  @IsUUID('7')
  groupId!: string;

  @IsEnum(ChapterKind)
  kind!: ChapterKind;

  @IsOptional()
  @IsString()
  @Matches(chapterDecimal)
  number?: string | null;

  @Transform(trim)
  @IsString()
  @Length(1, 200)
  displayLabel!: string;

  @IsString()
  @Matches(chapterDecimal)
  sortOrder!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  title?: string | null;
}

export class CreateEditorialReleaseDto {
  @IsUUID('7')
  publishingGroupId!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 35)
  @Validate(EditorialLanguageConstraint)
  language!: string;

  @IsOptional()
  @IsUUID('7')
  supersedesReleaseId?: string | null;
}
