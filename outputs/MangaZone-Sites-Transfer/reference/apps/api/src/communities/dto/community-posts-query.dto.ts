import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export enum CommunityPostSort {
  RECENT = 'recent',
}

export class CommunityPostsQueryDto {
  @IsOptional()
  @IsEnum(CommunityPostSort)
  sort: CommunityPostSort = CommunityPostSort.RECENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class CommunityPostCommentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class CommunityPostIdParamDto {
  @IsUUID()
  postId!: string;
}
