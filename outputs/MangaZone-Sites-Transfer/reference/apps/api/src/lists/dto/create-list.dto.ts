import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ListVisibility } from '../../../generated/prisma/client.js';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @ValidateIf((o: Record<string, unknown>) => o.description !== null)
  @IsString()
  @MaxLength(255)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  description?: string | null;

  @IsEnum(ListVisibility)
  @IsOptional()
  visibility?: ListVisibility;
}
