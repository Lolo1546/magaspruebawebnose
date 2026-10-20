import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CommunityRequestStatus } from '../../../generated/prisma/client.js';

export class CommunityCreationRequestModerationQueryDto {
  @IsOptional()
  @IsEnum(CommunityRequestStatus)
  status?: CommunityRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
