import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

function trimText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CommunityPostParamsDto {
  @IsUUID()
  postId!: string;
}

export class CommunityCommentParamsDto {
  @IsUUID()
  commentId!: string;
}

export class CreateCommunityPostDto {
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @Length(1, 200)
  title!: string;

  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @Length(1, 20000)
  body!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  isSpoiler?: boolean;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  spoilerChapterId?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    value === null ? null : trimText(value),
  )
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Length(1, 120)
  spoilerLabel?: string | null;
}

export class EditCommunityPostDto {
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 200)
  title?: string;

  @Transform(({ value }: { value: unknown }) => trimText(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 20000)
  body?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  isSpoiler?: boolean;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  spoilerChapterId?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    value === null ? null : trimText(value),
  )
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Length(1, 120)
  spoilerLabel?: string | null;
}

export class CreateCommunityPostCommentDto {
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @Length(1, 5000)
  body!: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  parentCommentId?: string | null;
}

export class EditCommunityPostCommentDto {
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 5000)
  body?: string;
}

export class CommunityContentDeletionRequestDto {
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @Length(1, 2000)
  reason!: string;

  @Transform(({ value }: { value: unknown }) => trimOptionalText(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  details?: string;
}

export class CommunityContentModerationDto {
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @Length(1, 2000)
  reason!: string;
}
