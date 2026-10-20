import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CsrfModule } from '../security/csrf/csrf.module.js';
import { SessionModule } from '../session/session.module.js';
import { CommunityAuthorizationService } from './community-authorization.service.js';
import { CommunityContentMutationService } from './community-content-mutation.service.js';
import { CommunityContentMutationsController } from './community-content-mutations.controller.js';
import { CommunityContentModerationController } from './community-content-moderation.controller.js';
import { CommunityContentModerationMapper } from './community-content-moderation.mapper.js';
import { CommunityContentModerationService } from './community-content-moderation.service.js';
import { CommunityCreationRequestModerationController } from './community-creation-request-moderation.controller.js';
import { CommunityCreationRequestModerationMapper } from './community-creation-request-moderation.mapper.js';
import { CommunityCreationRequestReviewService } from './community-creation-request-review.service.js';
import { CommunityCreationRequestsController } from './community-creation-requests.controller.js';
import { CommunityCreationRequestsMapper } from './community-creation-requests.mapper.js';
import { CommunityCreationRequestsService } from './community-creation-requests.service.js';
import { CommunityMemberManagementController } from './community-member-management.controller.js';
import { CommunityMemberManagementService } from './community-member-management.service.js';
import { CommunityMembershipLifecycleService } from './community-membership-lifecycle.service.js';
import { CommunityMembershipsController } from './community-memberships.controller.js';
import { CommunityPostsController } from './community-posts.controller.js';
import { CommunitiesController } from './communities.controller.js';
import { CommunitiesMapper } from './communities.mapper.js';
import { CommunitiesService } from './communities.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule, CsrfModule, SessionModule],
  controllers: [
    CommunitiesController,
    CommunityPostsController,
    CommunityContentMutationsController,
    CommunityContentModerationController,
    CommunityMembershipsController,
    CommunityMemberManagementController,
    CommunityCreationRequestsController,
    CommunityCreationRequestModerationController,
  ],
  providers: [
    CommunitiesService,
    CommunitiesMapper,
    CommunityAuthorizationService,
    CommunityContentMutationService,
    CommunityContentModerationService,
    CommunityContentModerationMapper,
    CommunityMembershipLifecycleService,
    CommunityMemberManagementService,
    CommunityCreationRequestsService,
    CommunityCreationRequestsMapper,
    CommunityCreationRequestReviewService,
    CommunityCreationRequestModerationMapper,
  ],
  exports: [CommunityAuthorizationService],
})
export class CommunitiesModule {}
