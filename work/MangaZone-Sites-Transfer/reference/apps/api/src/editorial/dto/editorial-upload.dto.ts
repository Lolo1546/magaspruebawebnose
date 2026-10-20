import { Equals, IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';
import { EditorialUploadPurpose } from '../../../generated/prisma/client.js';
import {
  COVER_CONTENT_TYPES,
  COVER_MAX_BYTES,
} from '../editorial-upload.policy.js';

export class FinalizeEditorialUploadDto {}

export class CreateEditorialUploadIntentDto {
  @Equals(EditorialUploadPurpose.MANGA_COVER)
  purpose!: typeof EditorialUploadPurpose.MANGA_COVER;

  @IsUUID()
  mangaId!: string;

  @IsIn(COVER_CONTENT_TYPES)
  contentType!: (typeof COVER_CONTENT_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(COVER_MAX_BYTES)
  expectedBytes!: number;
}
