import { Transform } from 'class-transformer';
import {
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { canonicalizeCreationRequestName } from '../../creation-requests/creation-request-name-normalizer.js';

function trimOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreateScanlationGroupCreationRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? canonicalizeCreationRequestName(value) : value,
  )
  @IsString()
  @Length(2, 120)
  proposedName!: string;

  @Transform(({ value }: { value: unknown }) => trimOptionalText(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 35)
  language!: string;

  @Transform(({ value }: { value: unknown }) => trimOptionalText(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  website?: string;
}
