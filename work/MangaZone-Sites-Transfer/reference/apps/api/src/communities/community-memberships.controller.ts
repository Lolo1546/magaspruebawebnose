import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { CsrfGuard } from '../security/csrf/guards/csrf.guard.js';
import { OriginGuard } from '../security/csrf/guards/origin.guard.js';
import { CommunityAuthorizationService } from './community-authorization.service.js';
import { CommunityMembershipLifecycleService } from './community-membership-lifecycle.service.js';
import type {
  CommunityMembershipMutationResponseDto,
  SelfCommunityMembershipsResponseDto,
} from './dto/community-membership-response.dto.js';
import { CommunitySlugParamDto } from './dto/community-param.dto.js';

@Controller('me/community-memberships')
@UseGuards(SessionGuard)
export class CommunityMembershipsController {
  constructor(
    private readonly communityAuthorization: CommunityAuthorizationService,
    private readonly communityMembershipLifecycle: CommunityMembershipLifecycleService,
  ) {}

  @Get()
  getSelfMemberships(
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ): Promise<SelfCommunityMembershipsResponseDto> {
    return this.communityAuthorization.getSelfMemberships(auth.userId);
  }

  @Put(':slug')
  @UseGuards(OriginGuard, CsrfGuard)
  join(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunitySlugParamDto,
  ): Promise<CommunityMembershipMutationResponseDto> {
    return this.communityMembershipLifecycle.join(params.slug, auth);
  }

  @Delete(':slug')
  @UseGuards(OriginGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @CurrentAuth() auth: AuthenticatedRequestContext,
    @Param() params: CommunitySlugParamDto,
  ): Promise<void> {
    await this.communityMembershipLifecycle.leave(params.slug, auth);
  }
}
