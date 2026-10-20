import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { CommunityContentModerationService } from './community-content-moderation.service.js';
import {
  CommunityContentModerationParamsDto,
  CommunityContentModerationQueryDto,
} from './dto/community-content-moderation-query.dto.js';
import type {
  CommunityModerationDetailResponseDto,
  CommunityModerationListResponseDto,
} from './dto/community-content-moderation-response.dto.js';

@Controller('moderation/community-content')
@UseGuards(SessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunityContentModerationController {
  constructor(private readonly service: CommunityContentModerationService) {}

  @Get()
  list(
    @Query() query: CommunityContentModerationQueryDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ): Promise<CommunityModerationListResponseDto> {
    return this.service.list(query, auth);
  }

  @Get(':type/:id')
  detail(
    @Param() params: CommunityContentModerationParamsDto,
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ): Promise<CommunityModerationDetailResponseDto> {
    return this.service.detail(params.type, params.id, auth);
  }
}
