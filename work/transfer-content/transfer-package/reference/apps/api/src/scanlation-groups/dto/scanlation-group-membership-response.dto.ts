import {
  ScanlationGroupMemberStatus,
  ScanlationGroupRole,
} from '../../../generated/prisma/client.js';

export interface SelfScanlationGroupSummaryDto {
  id: string;
  slug: string;
  name: string;
}

export interface SelfScanlationGroupMembershipDto {
  membershipId: string;
  group: SelfScanlationGroupSummaryDto;
  status: ScanlationGroupMemberStatus;
  roles: ScanlationGroupRole[];
  joinedAt: string;
  leftAt: string | null;
}

export interface SelfScanlationGroupMembershipsResponseDto {
  items: SelfScanlationGroupMembershipDto[];
}
