import { IsInt, IsUUID, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsUUID()
  chapterId!: string;

  @IsUUID()
  chapterReleaseId!: string;

  @IsInt()
  @Min(1)
  pageNumber!: number;
}
