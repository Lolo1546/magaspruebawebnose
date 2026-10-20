import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from '../../../generated/prisma/client.js';

export interface SelfCommunitySummaryDto {
  id: string;
  slug: string;
  name: string;
}

export interface SelfCommunityMembershipDto {
  membershipId: string;
  community: SelfCommunitySummaryDto;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: string;
  leftAt: string | null;
}

export interface SelfCommunityMembershipsResponseDto {
  items: SelfCommunityMembershipDto[];
}

export interface CommunityMembershipMutationResponseDto {
  membership: SelfCommunityMembershipDto;
}
