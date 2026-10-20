import { IsString, Matches, MaxLength } from 'class-validator';

export class CommunitySlugParamDto {
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
