import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard.js';
import { AdminService } from './admin.service.js';
import {
  AdminCommunitiesQueryDto,
  AdminScanlationGroupsQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-query.dto.js';
import type {
  AdminCommunityDetailDto,
  AdminCommunityListDto,
  AdminDashboardDto,
  AdminScanlationGroupDetailDto,
  AdminScanlationGroupListDto,
  AdminUserDetailDto,
  AdminUserListDto,
} from './dto/admin-response.dto.js';
import { GlobalAdminGuard } from './global-admin.guard.js';

@Controller('admin')
@UseGuards(SessionGuard, GlobalAdminGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('access')
  access(): { admin: true } {
    return { admin: true };
  }

  @Get('dashboard')
  dashboard(): Promise<AdminDashboardDto> {
    return this.admin.dashboard();
  }

  @Get('users')
  users(@Query() query: AdminUsersQueryDto): Promise<AdminUserListDto> {
    return this.admin.users(query);
  }

  @Get('users/:username')
  user(@Param('username') username: string): Promise<AdminUserDetailDto> {
    return this.admin.user(username);
  }

  @Get('communities')
  communities(
    @Query() query: AdminCommunitiesQueryDto,
  ): Promise<AdminCommunityListDto> {
    return this.admin.communities(query);
  }

  @Get('communities/:slug')
  community(@Param('slug') slug: string): Promise<AdminCommunityDetailDto> {
    return this.admin.community(slug);
  }

  @Get('scanlation-groups')
  groups(
    @Query() query: AdminScanlationGroupsQueryDto,
  ): Promise<AdminScanlationGroupListDto> {
    return this.admin.groups(query);
  }

  @Get('scanlation-groups/:slug')
  group(@Param('slug') slug: string): Promise<AdminScanlationGroupDetailDto> {
    return this.admin.group(slug);
  }
}
