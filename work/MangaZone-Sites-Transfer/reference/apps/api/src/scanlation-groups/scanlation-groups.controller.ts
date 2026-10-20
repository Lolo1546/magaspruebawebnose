import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ScanlationGroupSlugParamDto } from './dto/scanlation-group-param.dto.js';
import { ScanlationGroupQueryDto } from './dto/scanlation-group-query.dto.js';
import type {
  ScanlationGroupDetailResponseDto,
  ScanlationGroupIndexResponseDto,
} from './dto/scanlation-group-response.dto.js';
import { ScanlationGroupsService } from './scanlation-groups.service.js';

@Controller('scanlation-groups')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ScanlationGroupsController {
  constructor(
    private readonly scanlationGroupsService: ScanlationGroupsService,
  ) {}

  @Get()
  async getPublicGroups(
    @Query() query: ScanlationGroupQueryDto,
  ): Promise<ScanlationGroupIndexResponseDto> {
    return this.scanlationGroupsService.getPublicGroups(query);
  }

  @Get(':slug')
  async getPublicGroupBySlug(
    @Param() params: ScanlationGroupSlugParamDto,
  ): Promise<ScanlationGroupDetailResponseDto> {
    return this.scanlationGroupsService.getPublicGroupBySlug(params.slug);
  }
}
