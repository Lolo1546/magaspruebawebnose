import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SelfCommunityMembershipsResponseDto } from './dto/community-membership-response.dto.js';

export const ACTIVE_COMMUNITY_MEMBERSHIP_WHERE = {
  status: CommunityMemberStatus.ACTIVE,
  leftAt: null,
} as const;

export type CommunityMembershipAuthorityState = {
  id: string;
  userId: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  leftAt: Date | null;
};

export interface CommunityAuthority {
  exists: boolean;
  isOwner: boolean;
  isOwnerMirrorConsistent: boolean;
  role: CommunityMemberRole | null;
  canManageMembers: boolean;
  canModerateContent: boolean;
  canLeaveCommunity: boolean;
}

export interface ActiveCommunityManagementAuthority extends CommunityAuthority {
  communityId: string;
  ownerUserId: string;
}

type CommunityAuthorityClient = Pick<Prisma.TransactionClient, 'community'>;

function isActiveOpenMembership(
  membership: CommunityMembershipAuthorityState | null,
): membership is CommunityMembershipAuthorityState {
  return (
    membership?.status === CommunityMemberStatus.ACTIVE &&
    membership.leftAt === null
  );
}

export function evaluateCommunityAuthority(
  ownerUserId: string,
  memberships: CommunityMembershipAuthorityState[],
  actorUserId: string,
): CommunityAuthority {
  const activeMemberships = memberships.filter(isActiveOpenMembership);
  const actorMembership =
    activeMemberships.find((membership) => membership.userId === actorUserId) ??
    null;
  const isOwner = ownerUserId === actorUserId;
  const isOwnerMirrorConsistent = activeMemberships.some(
    (membership) =>
      membership.userId === ownerUserId &&
      membership.role === CommunityMemberRole.OWNER,
  );
  const role = actorMembership?.role ?? null;
  const hasAdministrativeRole = role === CommunityMemberRole.ADMIN || isOwner;
  const hasContentModerationRole =
    hasAdministrativeRole || role === CommunityMemberRole.MODERATOR;

  return {
    exists: true,
    isOwner,
    isOwnerMirrorConsistent,
    role,
    canManageMembers: isOwnerMirrorConsistent && hasAdministrativeRole,
    canModerateContent: isOwnerMirrorConsistent && hasContentModerationRole,
    canLeaveCommunity:
      isOwnerMirrorConsistent &&
      actorMembership !== null &&
      actorMembership.role !== CommunityMemberRole.OWNER &&
      !isOwner,
  };
}

function denyCommunityAuthority(): never {
  throw new ForbiddenException({
    statusCode: 403,
    code: 'DOMAIN_AUTHORIZATION_DENIED',
    message: 'Operación no permitida.',
  });
}

@Injectable()
export class CommunityAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActiveMembership(communityId: string, userId: string) {
    const membership = await this.prisma.communityMember.findFirst({
      where: {
        communityId,
        userId,
        ...ACTIVE_COMMUNITY_MEMBERSHIP_WHERE,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        leftAt: true,
      },
    });

    return isActiveOpenMembership(membership) ? membership : null;
  }

  async resolveAuthority(
    communityId: string,
    actorUserId: string,
    client: CommunityAuthorityClient = this.prisma,
  ): Promise<CommunityAuthority> {
    const community = await client.community.findUnique({
      where: { id: communityId },
      select: {
        ownerUserId: true,
        members: {
          where: {
            ...ACTIVE_COMMUNITY_MEMBERSHIP_WHERE,
            OR: [{ userId: actorUserId }, { role: CommunityMemberRole.OWNER }],
          },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            leftAt: true,
          },
        },
      },
    });

    if (!community) {
      return {
        exists: false,
        isOwner: false,
        isOwnerMirrorConsistent: false,
        role: null,
        canManageMembers: false,
        canModerateContent: false,
        canLeaveCommunity: false,
      };
    }

    return evaluateCommunityAuthority(
      community.ownerUserId,
      community.members,
      actorUserId,
    );
  }

  async assertCommunityOwner(
    communityId: string,
    actorUserId: string,
    options: { requireActiveOwnerMirror: boolean },
  ): Promise<CommunityAuthority> {
    const authority = await this.resolveAuthority(communityId, actorUserId);

    if (
      !authority.exists ||
      !authority.isOwner ||
      (options.requireActiveOwnerMirror && !authority.isOwnerMirrorConsistent)
    ) {
      denyCommunityAuthority();
    }

    return authority;
  }

  async assertCanManageCommunityMembers(
    communityId: string,
    actorUserId: string,
  ): Promise<CommunityAuthority> {
    const authority = await this.resolveAuthority(communityId, actorUserId);

    if (!authority.canManageMembers) {
      denyCommunityAuthority();
    }

    return authority;
  }

  async assertCanManageActiveCommunityBySlug(
    slug: string,
    actorUserId: string,
    client: CommunityAuthorityClient = this.prisma,
  ): Promise<ActiveCommunityManagementAuthority> {
    const community = await client.community.findFirst({
      where: { slug, status: CommunityStatus.ACTIVE },
      select: {
        id: true,
        ownerUserId: true,
        members: {
          where: {
            ...ACTIVE_COMMUNITY_MEMBERSHIP_WHERE,
            OR: [{ userId: actorUserId }, { role: CommunityMemberRole.OWNER }],
          },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true,
            leftAt: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'COMMUNITY_NOT_FOUND',
        message: 'Comunidad no encontrada.',
      });
    }

    const authority = evaluateCommunityAuthority(
      community.ownerUserId,
      community.members,
      actorUserId,
    );
    if (!authority.canManageMembers) denyCommunityAuthority();

    return {
      ...authority,
      communityId: community.id,
      ownerUserId: community.ownerUserId,
    };
  }

  async assertCanModerateCommunityContent(
    communityId: string,
    actorUserId: string,
    client: CommunityAuthorityClient = this.prisma,
  ): Promise<CommunityAuthority> {
    const authority = await this.resolveAuthority(
      communityId,
      actorUserId,
      client,
    );

    if (!authority.canModerateContent) {
      denyCommunityAuthority();
    }

    return authority;
  }

  async assertCanLeaveCommunity(
    communityId: string,
    actorUserId: string,
  ): Promise<CommunityAuthority> {
    const authority = await this.resolveAuthority(communityId, actorUserId);

    if (!authority.canLeaveCommunity) {
      denyCommunityAuthority();
    }

    return authority;
  }

  async getSelfMemberships(
    userId: string,
  ): Promise<SelfCommunityMembershipsResponseDto> {
    const memberships = await this.prisma.communityMember.findMany({
      where: {
        userId,
        ...ACTIVE_COMMUNITY_MEMBERSHIP_WHERE,
      },
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        leftAt: true,
        community: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    return {
      items: memberships.map((membership) => ({
        membershipId: membership.id,
        community: membership.community,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt.toISOString(),
        leftAt: membership.leftAt?.toISOString() ?? null,
      })),
    };
  }
}
