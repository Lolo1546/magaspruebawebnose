import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { AdminMutationsService } from './admin-mutations.service.js';
import type { AdminUserDetailDto } from './dto/admin-response.dto.js';
import {
  AdminMutationReasonDto,
  AdminPermissionMutationParamsDto,
  AdminRoleMutationParamsDto,
  AdminUserMutationParamsDto,
} from './dto/admin-mutation.dto.js';
import { GlobalAdminGuard } from './global-admin.guard.js';

@Controller('admin/users')
@UseGuards(SessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AdminMutationsController {
  constructor(private readonly mutations: AdminMutationsService) {}

  @Post(':username/suspend')
  @UseGuards(OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(HttpStatus.OK)
  suspend(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: AdminUserMutationParamsDto,
    @Body() body: AdminMutationReasonDto,
  ): Promise<AdminUserDetailDto> {
    return this.mutations.suspend(auth.userId, params.username, body.reason);
  }

  @Post(':username/restore')
  @UseGuards(OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: AdminUserMutationParamsDto,
    @Body() body: AdminMutationReasonDto,
  ): Promise<AdminUserDetailDto> {
    return this.mutations.restore(auth.userId, params.username, body.reason);
  }

  @Post(':username/roles/:role/grant')
  @UseGuards(OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(HttpStatus.OK)
  grantRole(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: AdminRoleMutationParamsDto,
    @Body() body: AdminMutationReasonDto,
  ): Promise<AdminUserDetailDto> {
    return this.mutations.grantRole(
      auth.userId,
      params.username,
      params.role,
      body.reason,
    );
  }

  @Post(':username/roles/:role/revoke')
  @UseGuards(OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(HttpStatus.OK)
  revokeRole(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: AdminRoleMutationParamsDto,
    @Body() body: AdminMutationReasonDto,
  ): Promise<AdminUserDetailDto> {
    return this.mutations.revokeRole(
      auth.userId,
      params.username,
      params.role,
      body.reason,
    );
  }

  @Post(':username/permissions/:permission/grant')
  @UseGuards(OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(HttpStatus.OK)
  grantPermission(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: AdminPermissionMutationParamsDto,
    @Body() body: AdminMutationReasonDto,
  ): Promise<AdminUserDetailDto> {
    return this.mutations.grantPermission(
      auth.userId,
      params.username,
      params.permission,
      body.reason,
    );
  }

  @Post(':username/permissions/:permission/revoke')
  @UseGuards(OriginGuard, CsrfGuard, GlobalAdminGuard)
  @HttpCode(HttpStatus.OK)
  revokePermission(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: AdminPermissionMutationParamsDto,
    @Body() body: AdminMutationReasonDto,
  ): Promise<AdminUserDetailDto> {
    return this.mutations.revokePermission(
      auth.userId,
      params.username,
      params.permission,
      body.reason,
    );
  }
}
