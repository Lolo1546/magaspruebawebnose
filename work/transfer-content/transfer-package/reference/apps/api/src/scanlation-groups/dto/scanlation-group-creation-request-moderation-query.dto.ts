import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ScanlationGroupRequestStatus } from '../../../generated/prisma/client.js';

export class ScanlationGroupCreationRequestModerationQueryDto {
  @IsOptional()
  @IsEnum(ScanlationGroupRequestStatus)
  status?: ScanlationGroupRequestStatus;

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
