import { IsInt, Max, Min } from 'class-validator';

export class EditorialReleaseTransitionDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;
}
