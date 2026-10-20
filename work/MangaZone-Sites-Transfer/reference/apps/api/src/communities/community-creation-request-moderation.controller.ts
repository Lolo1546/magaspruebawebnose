import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { GLOBAL_PERMISSIONS } from '../authorization/global-permissions.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CommunityCreationRequestReviewService } from './community-creation-request-review.service.js';
import { ApproveCommunityCreationRequestDto } from './dto/approve-community-creation-request.dto.js';
import { CommunityCreationRequestModerationQueryDto } from './dto/community-creation-request-moderation-query.dto.js';
import type {
  CommunityCreationRequestModerationListDto,
  CommunityCreationRequestModerationResponseDto,
} from './dto/community-creation-request-moderation-response.dto.js';
import { RejectCommunityCreationRequestDto } from './dto/reject-community-creation-request.dto.js';
import { RequestCommunityCreationRequestInfoDto } from './dto/request-community-creation-request-info.dto.js';

@Controller('moderation/community-creation-requests')
@UseGuards(SessionGuard)
@RequirePermissions(GLOBAL_PERMISSIONS.MODERATE_COMMUNITIES)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunityCreationRequestModerationController {
  constructor(
    private readonly reviewService: CommunityCreationRequestReviewService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  list(
    @Query() query: CommunityCreationRequestModerationQueryDto,
  ): Promise<CommunityCreationRequestModerationListDto> {
    return this.reviewService.list(query);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  detail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    return this.reviewService.detail(id);
  }

  @Post(':id/approve')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    void dto;
    return this.reviewService.approve(auth, id);
  }

  @Post(':id/reject')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCommunityCreationRequestDto,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    return this.reviewService.reject(auth, id, dto);
  }

  @Post(':id/request-info')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  @HttpCode(HttpStatus.OK)
  requestInfo(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestCommunityCreationRequestInfoDto,
  ): Promise<CommunityCreationRequestModerationResponseDto> {
    return this.reviewService.requestInfo(auth, id, dto);
  }
}
