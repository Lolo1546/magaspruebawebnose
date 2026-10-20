import {
  ConflictException,
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
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { evaluateCommunityAuthority } from './community-authorization.service.js';
import type {
  CommunityMembershipMutationResponseDto,
  SelfCommunityMembershipDto,
} from './dto/community-membership-response.dto.js';

const membershipStateSelect = {
  id: true,
  userId: true,
  role: true,
  status: true,
  joinedAt: true,
  leftAt: true,
} satisfies Prisma.CommunityMemberSelect;

type MembershipState = Prisma.CommunityMemberGetPayload<{
  select: typeof membershipStateSelect;
}>;

type CommunitySummary = {
  id: string;
  slug: string;
  name: string;
};

function conflict(code: string, message: string): never {
  throw new ConflictException({ statusCode: 409, code, message });
}

function assertJoinableMembershipState(membership: MembershipState): void {
  if (membership.status === CommunityMemberStatus.SUSPENDED) {
    conflict(
      'COMMUNITY_MEMBERSHIP_SUSPENDED',
      'La membresía de la comunidad está suspendida.',
    );
  }

  if (membership.status !== CommunityMemberStatus.ACTIVE) {
    conflict(
      'COMMUNITY_MEMBERSHIP_CONFLICT',
      'La membresía de la comunidad tiene un estado incompatible.',
    );
  }
}

function toMembershipDto(
  membership: MembershipState,
  community: CommunitySummary,
): SelfCommunityMembershipDto {
  return {
    membershipId: membership.id,
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
    },
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt.toISOString(),
    leftAt: membership.leftAt?.toISOString() ?? null,
  };
}

@Injectable()
export class CommunityMembershipLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async join(
    slug: string,
    auth: Pick<AuthenticatedRequestContext, 'userId' | 'userStatus'>,
  ): Promise<CommunityMembershipMutationResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const community = await tx.community.findFirst({
          where: { slug, status: CommunityStatus.ACTIVE },
          select: {
            id: true,
            slug: true,
            name: true,
            ownerUserId: true,
          },
        });

        if (!community) {
          throw new NotFoundException('Comunidad no encontrada');
        }

        const openMembership = await tx.communityMember.findFirst({
          where: {
            communityId: community.id,
            userId: actorUserId,
            leftAt: null,
          },
          select: membershipStateSelect,
        });

        if (openMembership) {
          assertJoinableMembershipState(openMembership);

          if (
            community.ownerUserId === actorUserId &&
            openMembership.role !== CommunityMemberRole.OWNER
          ) {
            conflict(
              'COMMUNITY_MEMBERSHIP_INVARIANT_VIOLATION',
              'La membresía de la comunidad no es consistente.',
            );
          }

          return {
            membership: toMembershipDto(openMembership, community),
          };
        }

        if (community.ownerUserId === actorUserId) {
          conflict(
            'COMMUNITY_MEMBERSHIP_INVARIANT_VIOLATION',
            'La membresía de la comunidad no es consistente.',
          );
        }

        const latestClosedMembership = await tx.communityMember.findFirst({
          where: {
            communityId: community.id,
            userId: actorUserId,
            leftAt: { not: null },
          },
          orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
          select: membershipStateSelect,
        });

        if (latestClosedMembership?.status === CommunityMemberStatus.REMOVED) {
          conflict(
            'COMMUNITY_MEMBERSHIP_REMOVED',
            'La membresía de la comunidad fue removida.',
          );
        }

        if (
          latestClosedMembership &&
          latestClosedMembership.status !== CommunityMemberStatus.LEFT
        ) {
          conflict(
            'COMMUNITY_MEMBERSHIP_CONFLICT',
            'La membresía de la comunidad tiene un estado incompatible.',
          );
        }

        const membership = await tx.communityMember.create({
          data: {
            communityId: community.id,
            userId: actorUserId,
            role: CommunityMemberRole.MEMBER,
            status: CommunityMemberStatus.ACTIVE,
            leftAt: null,
          },
          select: membershipStateSelect,
        });

        return { membership: toMembershipDto(membership, community) };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.resolveConcurrentJoin(slug, actorUserId);
      }

      throw error;
    }
  }

  async leave(
    slug: string,
    auth: Pick<AuthenticatedRequestContext, 'userId' | 'userStatus'>,
  ): Promise<void> {
    const actorUserId = assertActiveMutationActor(auth);

    await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.findUnique({
        where: { slug },
        select: {
          id: true,
          ownerUserId: true,
          members: {
            where: {
              leftAt: null,
              OR: [
                { userId: actorUserId },
                { role: CommunityMemberRole.OWNER },
              ],
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
        return;
      }

      const authority = evaluateCommunityAuthority(
        community.ownerUserId,
        community.members,
        actorUserId,
      );

      if (authority.isOwner) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'COMMUNITY_OWNER_CANNOT_LEAVE',
          message: 'El propietario no puede abandonar la comunidad.',
        });
      }

      const openMembership = community.members.find(
        (membership) => membership.userId === actorUserId,
      );

      if (!openMembership) {
        return;
      }

      if (openMembership.status === CommunityMemberStatus.SUSPENDED) {
        conflict(
          'COMMUNITY_MEMBERSHIP_SUSPENDED',
          'La membresía de la comunidad está suspendida.',
        );
      }

      if (!authority.isOwnerMirrorConsistent) {
        conflict(
          'COMMUNITY_MEMBERSHIP_INVARIANT_VIOLATION',
          'La membresía de la comunidad no es consistente.',
        );
      }

      if (
        openMembership.status !== CommunityMemberStatus.ACTIVE ||
        openMembership.role === CommunityMemberRole.OWNER ||
        !authority.canLeaveCommunity
      ) {
        conflict(
          'COMMUNITY_MEMBERSHIP_INVARIANT_VIOLATION',
          'La membresía de la comunidad no es consistente.',
        );
      }

      const transactionNow = new Date();
      const result = await tx.communityMember.updateMany({
        where: {
          id: openMembership.id,
          userId: actorUserId,
          status: CommunityMemberStatus.ACTIVE,
          leftAt: null,
        },
        data: {
          status: CommunityMemberStatus.LEFT,
          leftAt: transactionNow,
        },
      });

      if (result.count === 0) {
        const concurrentOpenMembership = await tx.communityMember.findFirst({
          where: {
            communityId: community.id,
            userId: actorUserId,
            leftAt: null,
          },
          select: membershipStateSelect,
        });

        if (
          concurrentOpenMembership?.status === CommunityMemberStatus.SUSPENDED
        ) {
          conflict(
            'COMMUNITY_MEMBERSHIP_SUSPENDED',
            'La membresía de la comunidad está suspendida.',
          );
        }

        if (concurrentOpenMembership) {
          conflict(
            'COMMUNITY_MEMBERSHIP_CONFLICT',
            'La membresía de la comunidad cambió concurrentemente.',
          );
        }
      }
    });
  }

  private async resolveConcurrentJoin(
    slug: string,
    actorUserId: string,
  ): Promise<CommunityMembershipMutationResponseDto> {
    const membership = await this.prisma.communityMember.findFirst({
      where: {
        userId: actorUserId,
        leftAt: null,
        community: { slug, status: CommunityStatus.ACTIVE },
      },
      select: {
        ...membershipStateSelect,
        community: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!membership) {
      conflict(
        'COMMUNITY_MEMBERSHIP_CONFLICT',
        'La membresía de la comunidad cambió concurrentemente.',
      );
    }

    assertJoinableMembershipState(membership);

    return {
      membership: toMembershipDto(membership, membership.community),
    };
  }
}
