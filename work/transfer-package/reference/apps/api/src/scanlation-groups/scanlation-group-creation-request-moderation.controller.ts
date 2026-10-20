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
import { ApproveScanlationGroupCreationRequestDto } from './dto/approve-scanlation-group-creation-request.dto.js';
import { RejectScanlationGroupCreationRequestDto } from './dto/reject-scanlation-group-creation-request.dto.js';
import { RequestScanlationGroupCreationRequestInfoDto } from './dto/request-scanlation-group-creation-request-info.dto.js';
import { ScanlationGroupCreationRequestModerationQueryDto } from './dto/scanlation-group-creation-request-moderation-query.dto.js';
import type {
  ScanlationGroupCreationRequestModerationListDto,
  ScanlationGroupCreationRequestModerationResponseDto,
} from './dto/scanlation-group-creation-request-moderation-response.dto.js';
import { ScanlationGroupCreationRequestReviewService } from './scanlation-group-creation-request-review.service.js';

@Controller('moderation/scanlation-group-creation-requests')
@UseGuards(SessionGuard)
@RequirePermissions(GLOBAL_PERMISSIONS.MODERATE_SCANLATIONS)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ScanlationGroupCreationRequestModerationController {
  constructor(
    private readonly reviewService: ScanlationGroupCreationRequestReviewService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  list(
    @Query() query: ScanlationGroupCreationRequestModerationQueryDto,
  ): Promise<ScanlationGroupCreationRequestModerationListDto> {
    return this.reviewService.list(query);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  detail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    return this.reviewService.detail(id);
  }

  @Post(':id/approve')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    void dto;
    return this.reviewService.approve(auth, id);
  }

  @Post(':id/reject')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectScanlationGroupCreationRequestDto,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    return this.reviewService.reject(auth, id, dto);
  }

  @Post(':id/request-info')
  @UseGuards(OriginGuard, CsrfGuard, PermissionGuard)
  @HttpCode(HttpStatus.OK)
  requestInfo(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestScanlationGroupCreationRequestInfoDto,
  ): Promise<ScanlationGroupCreationRequestModerationResponseDto> {
    return this.reviewService.requestInfo(auth, id, dto);
  }
}
