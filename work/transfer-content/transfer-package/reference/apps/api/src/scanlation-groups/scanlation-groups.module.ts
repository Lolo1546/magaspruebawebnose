import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { SessionModule } from '../session/session.module.js';
import { ScanlationGroupAuthorizationService } from './scanlation-group-authorization.service.js';
import { ScanlationGroupCreationRequestModerationController } from './scanlation-group-creation-request-moderation.controller.js';
import { ScanlationGroupCreationRequestModerationMapper } from './scanlation-group-creation-request-moderation.mapper.js';
import { ScanlationGroupCreationRequestReviewService } from './scanlation-group-creation-request-review.service.js';
import { ScanlationGroupCreationRequestsController } from './scanlation-group-creation-requests.controller.js';
import { ScanlationGroupCreationRequestsMapper } from './scanlation-group-creation-requests.mapper.js';
import { ScanlationGroupCreationRequestsService } from './scanlation-group-creation-requests.service.js';
import { ScanlationGroupMembershipsController } from './scanlation-group-memberships.controller.js';
import { ScanlationGroupMemberManagementController } from './scanlation-group-member-management.controller.js';
import { ScanlationGroupMemberManagementService } from './scanlation-group-member-management.service.js';
import { ScanlationGroupsController } from './scanlation-groups.controller.js';
import { ScanlationGroupsMapper } from './scanlation-groups.mapper.js';
import { ScanlationGroupsService } from './scanlation-groups.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule, CsrfModule, SessionModule],
  controllers: [
    ScanlationGroupsController,
    ScanlationGroupMembershipsController,
    ScanlationGroupMemberManagementController,
    ScanlationGroupCreationRequestsController,
    ScanlationGroupCreationRequestModerationController,
  ],
  providers: [
    ScanlationGroupsService,
    ScanlationGroupsMapper,
    ScanlationGroupAuthorizationService,
    ScanlationGroupMemberManagementService,
    ScanlationGroupCreationRequestsService,
    ScanlationGroupCreationRequestsMapper,
    ScanlationGroupCreationRequestReviewService,
    ScanlationGroupCreationRequestModerationMapper,
  ],
  exports: [ScanlationGroupAuthorizationService],
})
export class ScanlationGroupsModule {}
