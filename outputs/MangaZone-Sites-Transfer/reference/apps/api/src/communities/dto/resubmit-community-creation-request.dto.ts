import { Transform } from 'class-transformer';
import {
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { canonicalizeCreationRequestName } from '../../creation-requests/creation-request-name-normalizer.js';

function trimNullableText(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function trimOptionalMessage(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class ResubmitCommunityCreationRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? canonicalizeCreationRequestName(value) : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(2, 120)
  proposedName?: string;

  @Transform(({ value }: { value: unknown }) => trimNullableText(value))
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  relatedMangaId?: string | null;

  @Transform(({ value }: { value: unknown }) => trimOptionalMessage(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 2000)
  responseMessage?: string;
}
