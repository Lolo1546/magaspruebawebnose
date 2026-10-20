import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CommunityMemberManagementService } from './community-member-management.service.js';
import {
  ChangeCommunityMemberRoleDto,
  CommunityMemberParamsDto,
  CommunityMembersQueryDto,
  type CommunityMemberManagementResponseDto,
  type CommunityMembersResponseDto,
} from './dto/community-member-management.dto.js';
import { CommunitySlugParamDto } from './dto/community-param.dto.js';

@Controller('communities/:slug/members')
@UseGuards(SessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CommunityMemberManagementController {
  constructor(private readonly service: CommunityMemberManagementService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunitySlugParamDto,
    @Query() query: CommunityMembersQueryDto,
  ): Promise<CommunityMembersResponseDto> {
    return this.service.list(params.slug, auth.userId, query);
  }

  @Patch(':membershipId/role')
  @UseGuards(OriginGuard, CsrfGuard)
  changeRole(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityMemberParamsDto,
    @Body() dto: ChangeCommunityMemberRoleDto,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.service.changeRole(
      params.slug,
      params.membershipId,
      dto.role,
      auth,
    );
  }

  @Post(':membershipId/suspend')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  suspend(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityMemberParamsDto,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.service.suspend(params.slug, params.membershipId, auth);
  }

  @Post(':membershipId/restore')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityMemberParamsDto,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.service.restore(params.slug, params.membershipId, auth);
  }

  @Delete(':membershipId')
  @UseGuards(OriginGuard, CsrfGuard)
  remove(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunityMemberParamsDto,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.service.remove(params.slug, params.membershipId, auth);
  }
}
