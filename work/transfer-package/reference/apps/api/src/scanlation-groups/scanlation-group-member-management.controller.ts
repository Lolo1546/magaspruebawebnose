import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import {
  AddScanlationGroupMemberDto,
  ScanlationGroupMemberParamsDto,
  ScanlationGroupMemberRoleParamsDto,
  type ScanlationGroupMemberManagementResponseDto,
  ScanlationGroupMembersQueryDto,
  type ScanlationGroupMembersResponseDto,
} from './dto/scanlation-group-member-management.dto.js';
import { ScanlationGroupSlugParamDto } from './dto/scanlation-group-param.dto.js';
import { ScanlationGroupMemberManagementService } from './scanlation-group-member-management.service.js';

@Controller('scanlation-groups/:slug/members')
@UseGuards(SessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ScanlationGroupMemberManagementController {
  constructor(
    private readonly service: ScanlationGroupMemberManagementService,
  ) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupSlugParamDto,
    @Query() query: ScanlationGroupMembersQueryDto,
  ): Promise<ScanlationGroupMembersResponseDto> {
    return this.service.list(params.slug, auth.userId, query);
  }

  @Post()
  @UseGuards(OriginGuard, CsrfGuard)
  addMember(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupSlugParamDto,
    @Body() dto: AddScanlationGroupMemberDto,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.service.addMember(params.slug, dto.username, dto.roles, auth);
  }

  @Post(':membershipId/roles/:role/add')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  addRole(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupMemberRoleParamsDto,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.service.addRole(
      params.slug,
      params.membershipId,
      params.role,
      auth,
    );
  }

  @Delete(':membershipId/roles/:role')
  @UseGuards(OriginGuard, CsrfGuard)
  removeRole(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupMemberRoleParamsDto,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.service.removeRole(
      params.slug,
      params.membershipId,
      params.role,
      auth,
    );
  }

  @Post(':membershipId/suspend')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  suspend(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupMemberParamsDto,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.service.suspend(params.slug, params.membershipId, auth);
  }

  @Post(':membershipId/restore')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupMemberParamsDto,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.service.restore(params.slug, params.membershipId, auth);
  }

  @Delete(':membershipId')
  @UseGuards(OriginGuard, CsrfGuard)
  remove(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: ScanlationGroupMemberParamsDto,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.service.remove(params.slug, params.membershipId, auth);
  }
}
