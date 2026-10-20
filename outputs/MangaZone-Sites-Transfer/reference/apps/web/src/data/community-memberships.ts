export const communityMembershipRoles = [
  "OWNER",
  "ADMIN",
  "MODERATOR",
  "MEMBER",
] as const;

export type CommunityMembershipRole =
  (typeof communityMembershipRoles)[number];

export const communityMembershipStatuses = [
  "ACTIVE",
  "LEFT",
  "REMOVED",
  "SUSPENDED",
] as const;

export type CommunityMembershipStatus =
  (typeof communityMembershipStatuses)[number];

export type ApiSelfCommunityMembership = {
  readonly community: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  };
  readonly joinedAt: string;
  readonly leftAt: string | null;
  readonly membershipId: string;
  readonly role: CommunityMembershipRole;
  readonly status: CommunityMembershipStatus;
};

export type ApiSelfCommunityMembershipsResponse = {
  readonly items: readonly ApiSelfCommunityMembership[];
};

export type ApiCommunityMembershipMutationResponse = {
  readonly membership: ApiSelfCommunityMembership;
};

export type SelfCommunityMembership = {
  readonly community: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  };
  readonly joinedAt: string;
  readonly leftAt: string | null;
  readonly membershipId: string;
  readonly role: CommunityMembershipRole;
  readonly status: CommunityMembershipStatus;
};

export function mapApiSelfCommunityMembership(
  membership: ApiSelfCommunityMembership,
): SelfCommunityMembership {
  return {
    community: {
      id: membership.community.id,
      name: membership.community.name,
      slug: membership.community.slug,
    },
    joinedAt: membership.joinedAt,
    leftAt: membership.leftAt,
    membershipId: membership.membershipId,
    role: membership.role,
    status: membership.status,
  };
}
