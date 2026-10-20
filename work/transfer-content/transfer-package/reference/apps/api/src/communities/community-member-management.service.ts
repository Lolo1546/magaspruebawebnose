import { Injectable } from '@nestjs/common';
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  Prisma,
  UserStatus,
} from '../../generated/prisma/client.js';
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CommunityAuthorizationService,
  type ActiveCommunityManagementAuthority,
} from './community-authorization.service.js';
import {
  communityMemberAccountIneligible,
  communityMemberNotFound,
  communityMemberTargetForbidden,
  communityMembershipConflict,
  communityMembershipInvalidState,
  communityMembershipNoChanges,
  communityOwnerProtected,
} from './community-member-management.errors.js';
import type {
  CommunityMemberManagementResponseDto,
  CommunityMembersQueryDto,
  CommunityMembersResponseDto,
  ManagedCommunityMemberDto,
} from './dto/community-member-management.dto.js';

const SERIALIZABLE_MAX_ATTEMPTS = 3;

const managedMemberResponseSelect = {
  id: true,
  role: true,
  status: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  },
} satisfies Prisma.CommunityMemberSelect;

type ManagedMemberProjection = Prisma.CommunityMemberGetPayload<{
  select: typeof managedMemberResponseSelect;
}>;

const managedMemberStateSelect = {
  ...managedMemberResponseSelect,
  userId: true,
  leftAt: true,
  user: {
    select: {
      ...managedMemberResponseSelect.user.select,
      status: true,
    },
  },
} satisfies Prisma.CommunityMemberSelect;

type ManagedMemberState = Prisma.CommunityMemberGetPayload<{
  select: typeof managedMemberStateSelect;
}>;

type MutationKind = 'role' | 'suspend' | 'restore' | 'remove';

function toManagedMemberDto(
  membership: ManagedMemberProjection,
): ManagedCommunityMemberDto {
  return {
    id: membership.id,
    user: {
      id: membership.user.id,
      username: membership.user.username,
      displayName: membership.user.profile?.displayName ?? null,
    },
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt.toISOString(),
  };
}

function isSerializableConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  ) {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('cause' in error)) {
    return false;
  }
  const cause = error.cause;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'originalCode' in cause &&
    cause.originalCode === '40001' &&
    'kind' in cause &&
    cause.kind === 'TransactionWriteConflict'
  );
}

function assertTargetAuthority(
  authority: ActiveCommunityManagementAuthority,
  actorUserId: string,
  target: ManagedMemberState,
): void {
  if (target.userId === actorUserId) throw communityMemberTargetForbidden();
  if (target.role === CommunityMemberRole.OWNER) {
    throw communityMemberTargetForbidden();
  }
  if (
    !authority.isOwner &&
    target.role !== CommunityMemberRole.MODERATOR &&
    target.role !== CommunityMemberRole.MEMBER
  ) {
    throw communityMemberTargetForbidden();
  }
}

function assertRoleAssignment(
  authority: ActiveCommunityManagementAuthority,
  target: ManagedMemberState,
  requestedRole: CommunityMemberRole,
): void {
  if (requestedRole === CommunityMemberRole.OWNER) {
    throw communityMemberTargetForbidden();
  }
  if (
    !authority.isOwner &&
    requestedRole !== CommunityMemberRole.MODERATOR &&
    requestedRole !== CommunityMemberRole.MEMBER
  ) {
    throw communityMemberTargetForbidden();
  }
  if (target.role === requestedRole) throw communityMembershipNoChanges();
}

@Injectable()
export class CommunityMemberManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communityAuthorization: CommunityAuthorizationService,
  ) {}

  async list(
    slug: string,
    actorUserId: string,
    query: CommunityMembersQueryDto,
  ): Promise<CommunityMembersResponseDto> {
    const authority =
      await this.communityAuthorization.assertCanManageActiveCommunityBySlug(
        slug,
        actorUserId,
      );
    const where: Prisma.CommunityMemberWhereInput = {
      communityId: authority.communityId,
      status: {
        in: [CommunityMemberStatus.ACTIVE, CommunityMemberStatus.SUSPENDED],
      },
      leftAt: null,
    };
    const [total, members] = await this.prisma.$transaction([
      this.prisma.communityMember.count({ where }),
      this.prisma.communityMember.findMany({
        where,
        orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: managedMemberResponseSelect,
      }),
    ]);

    return {
      items: members.map(toManagedMemberDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  changeRole(
    slug: string,
    membershipId: string,
    requestedRole: CommunityMemberRole,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.mutate(slug, membershipId, auth, 'role', requestedRole);
  }

  suspend(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.mutate(slug, membershipId, auth, 'suspend');
  }

  restore(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.mutate(slug, membershipId, auth, 'restore');
  }

  remove(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
  ): Promise<CommunityMemberManagementResponseDto> {
    return this.mutate(slug, membershipId, auth, 'remove');
  }

  private async mutate(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
    kind: MutationKind,
    requestedRole?: CommunityMemberRole,
  ): Promise<CommunityMemberManagementResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);

    for (let attempt = 1; attempt <= SERIALIZABLE_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const authority =
              await this.communityAuthorization.assertCanManageActiveCommunityBySlug(
                slug,
                actorUserId,
                tx,
              );
            const target = await tx.communityMember.findFirst({
              where: {
                id: membershipId,
                communityId: authority.communityId,
              },
              select: managedMemberStateSelect,
            });
            if (!target) throw communityMemberNotFound();
            if (target.userId === authority.ownerUserId) {
              throw communityOwnerProtected();
            }
            assertTargetAuthority(authority, actorUserId, target);

            const data: Prisma.CommunityMemberUpdateManyMutationInput = {};
            const where: Prisma.CommunityMemberWhereInput = {
              id: target.id,
              communityId: authority.communityId,
              role: target.role,
              status: target.status,
              leftAt: null,
            };

            if (kind === 'role') {
              if (target.status !== CommunityMemberStatus.ACTIVE) {
                throw communityMembershipInvalidState();
              }
              if (target.user.status !== UserStatus.ACTIVE) {
                throw communityMemberAccountIneligible();
              }
              if (requestedRole === undefined) {
                throw communityMembershipConflict();
              }
              assertRoleAssignment(authority, target, requestedRole);
              where.user = { status: UserStatus.ACTIVE };
              data.role = requestedRole;
            } else if (kind === 'suspend') {
              if (target.status !== CommunityMemberStatus.ACTIVE) {
                throw communityMembershipInvalidState();
              }
              data.status = CommunityMemberStatus.SUSPENDED;
            } else if (kind === 'restore') {
              if (target.status !== CommunityMemberStatus.SUSPENDED) {
                throw communityMembershipInvalidState();
              }
              if (target.user.status !== UserStatus.ACTIVE) {
                throw communityMemberAccountIneligible();
              }
              where.user = { status: UserStatus.ACTIVE };
              data.status = CommunityMemberStatus.ACTIVE;
            } else {
              if (
                target.status !== CommunityMemberStatus.ACTIVE &&
                target.status !== CommunityMemberStatus.SUSPENDED
              ) {
                throw communityMembershipInvalidState();
              }
              data.status = CommunityMemberStatus.REMOVED;
              data.leftAt = new Date();
            }

            const updated = await tx.communityMember.updateMany({
              where,
              data,
            });
            if (updated.count !== 1) throw communityMembershipConflict();

            const member = await tx.communityMember.findUnique({
              where: { id: target.id },
              select: managedMemberResponseSelect,
            });
            if (!member) throw communityMemberNotFound();
            return { member: toManagedMemberDto(member) };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (!isSerializableConflict(error)) throw error;
        if (attempt === SERIALIZABLE_MAX_ATTEMPTS) {
          throw communityMembershipConflict();
        }
      }
    }

    throw communityMembershipConflict();
  }
}
