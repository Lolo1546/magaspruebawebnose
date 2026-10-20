import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { SessionGuard } from '../auth/guards/session.guard.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import type { SelfScanlationGroupMembershipsResponseDto } from './dto/scanlation-group-membership-response.dto.js';
import { ScanlationGroupAuthorizationService } from './scanlation-group-authorization.service.js';

@Controller('me/scanlation-group-memberships')
@UseGuards(SessionGuard)
export class ScanlationGroupMembershipsController {
  constructor(
    private readonly scanlationGroupAuthorization: ScanlationGroupAuthorizationService,
  ) {}

  @Get()
  getSelfMemberships(
    @CurrentAuth() auth: AuthenticatedRequestContext,
  ): Promise<SelfScanlationGroupMembershipsResponseDto> {
    return this.scanlationGroupAuthorization.getSelfMemberships(auth.userId);
  }
}
