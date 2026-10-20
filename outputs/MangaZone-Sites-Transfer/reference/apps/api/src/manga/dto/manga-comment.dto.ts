import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class MangaCommentSlugDto {
  @IsString()
  @Length(1, 200)
  slug!: string;
}

export class MangaCommentIdDto {
  @IsUUID()
  commentId!: string;
}

export class MangaCommentQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class CreateMangaCommentDto {
  @Transform(trim)
  @IsString()
  @Length(1, 5000)
  body!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  isSpoiler?: boolean;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  parentCommentId?: string | null;
}

export class EditMangaCommentDto {
  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 5000)
  body?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  isSpoiler?: boolean;
}

export class ModerateMangaCommentDto {
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export class MangaCommentOwnershipDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @IsUUID(undefined, { each: true })
  commentIds!: string[];
}

export class RemoveMangaCommentDto {}
