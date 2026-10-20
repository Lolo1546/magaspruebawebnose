import { IsIn, IsInt, IsUUID, Max, Min, ValidateIf } from 'class-validator';
import {
  THUMBNAIL_CONTENT_TYPES,
  THUMBNAIL_MAX_BYTES,
} from '../editorial-thumbnail.policy.js';

export class ThumbnailGroupDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID('7')
  groupId?: string;
}

export class ThumbnailIntentDto extends ThumbnailGroupDto {
  @IsIn(THUMBNAIL_CONTENT_TYPES)
  contentType!: (typeof THUMBNAIL_CONTENT_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(THUMBNAIL_MAX_BYTES)
  expectedBytes!: number;
}

export class SetThumbnailDto extends ThumbnailGroupDto {
  @IsUUID('7')
  assetId!: string;
}

export class RequestThumbnailDto {
  @IsUUID('7')
  groupId!: string;

  @IsUUID('7')
  assetId!: string;
}

export class OverrideThumbnailDto {
  @IsUUID('7')
  assetId!: string;
}

export class ResolveThumbnailDto {}
