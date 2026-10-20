export class ProgressResponseDto {
  mangaId!: string;
  chapterId!: string;
  chapterReleaseId!: string | null;
  pageNumber!: number;
  progressPercent!: number;
  completed?: boolean;
}
