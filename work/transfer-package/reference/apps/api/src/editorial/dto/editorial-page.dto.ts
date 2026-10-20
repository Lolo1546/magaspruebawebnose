import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  PAGE_CONTENT_TYPES,
  PAGE_MAX_BYTES,
} from '../editorial-page.policy.js';

export class CreateEditorialPageIntentDto {
  @IsIn(PAGE_CONTENT_TYPES)
  contentType!: (typeof PAGE_CONTENT_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(PAGE_MAX_BYTES)
  expectedBytes!: number;
}

export class ReorderEditorialPagesDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;

  @IsArray()
  @ArrayUnique()
  @IsUUID('7', { each: true })
  pageIds!: string[];
}
