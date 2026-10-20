import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ScanlationGroupMemberStatus,
  ScanlationGroupRole,
  UserStatus,
} from '../../generated/prisma/client.js';
import { assertActiveMutationActor } from '../auth/assert-active-mutation-actor.js';
import { normalizeAuthUsername } from '../auth/identity/auth-identity-normalizer.js';
import type { AuthenticatedRequestContext } from '../auth/types/authenticated-request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ScanlationGroupAuthorizationService,
  type VerifiedGroupManagementAuthority,
} from './scanlation-group-authorization.service.js';
import {
  scanlationGroupFounderProtected,
  scanlationGroupMemberAccountIneligible,
  scanlationGroupMemberNotFound,
  scanlationGroupMemberRoleRequired,
  scanlationGroupMemberTargetForbidden,
  scanlationGroupMembershipConflict,
  scanlationGroupMembershipInvalidState,
  scanlationGroupMembershipNoChanges,
  scanlationGroupOpenMembershipConflict,
} from './scanlation-group-member-management.errors.js';
import type {
  ManagedScanlationGroupMemberDto,
  ScanlationGroupMemberManagementResponseDto,
  ScanlationGroupMembersQueryDto,
  ScanlationGroupMembersResponseDto,
} from './dto/scanlation-group-member-management.dto.js';

const SERIALIZABLE_MAX_ATTEMPTS = 3;

const OPERATIONAL_ROLES = new Set<ScanlationGroupRole>([
  ScanlationGroupRole.UPLOADER,
  ScanlationGroupRole.TRANSLATOR,
  ScanlationGroupRole.CLEANER,
  ScanlationGroupRole.REDRAWER,
  ScanlationGroupRole.TYPESETTER,
  ScanlationGroupRole.PROOFREADER,
]);

const managedMemberResponseSelect = {
  id: true,
  status: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  },
  roles: {
    orderBy: { role: 'asc' },
    select: { role: true },
  },
} satisfies Prisma.ScanlationGroupMemberSelect;

type ManagedMemberProjection = Prisma.ScanlationGroupMemberGetPayload<{
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
} satisfies Prisma.ScanlationGroupMemberSelect;

type ManagedMemberState = Prisma.ScanlationGroupMemberGetPayload<{
  select: typeof managedMemberStateSelect;
}>;

type LifecycleKind = 'suspend' | 'restore' | 'remove';

function toManagedMemberDto(
  membership: ManagedMemberProjection,
): ManagedScanlationGroupMemberDto {
  return {
    id: membership.id,
    user: {
      id: membership.user.id,
      username: membership.user.username,
      displayName: membership.user.profile?.displayName ?? null,
    },
    roles: membership.roles.map(({ role }) => role),
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

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function rolesOf(target: ManagedMemberState): ScanlationGroupRole[] {
  return target.roles.map(({ role }) => role);
}

function assertTargetAuthority(
  authority: VerifiedGroupManagementAuthority,
  actorUserId: string,
  target: ManagedMemberState,
): void {
  const targetRoles = rolesOf(target);
  if (targetRoles.includes(ScanlationGroupRole.FOUNDER)) {
    throw scanlationGroupFounderProtected();
  }
  if (target.userId === actorUserId) {
    throw scanlationGroupMemberTargetForbidden();
  }
  if (!authority.isFounder && targetRoles.includes(ScanlationGroupRole.ADMIN)) {
    throw scanlationGroupMemberTargetForbidden();
  }
}

function assertRoleAllowedForActor(
  authority: VerifiedGroupManagementAuthority,
  role: ScanlationGroupRole,
): void {
  if (role === ScanlationGroupRole.FOUNDER) {
    throw scanlationGroupMemberTargetForbidden();
  }
  if (role === ScanlationGroupRole.ADMIN && !authority.isFounder) {
    throw scanlationGroupMemberTargetForbidden();
  }
  if (role !== ScanlationGroupRole.ADMIN && !OPERATIONAL_ROLES.has(role)) {
    throw scanlationGroupMemberTargetForbidden();
  }
}

function assertInitialRoles(
  authority: VerifiedGroupManagementAuthority,
  roles: ScanlationGroupRole[],
): void {
  if (roles.length === 0) throw scanlationGroupMemberRoleRequired();
  if (new Set(roles).size !== roles.length) {
    throw scanlationGroupMembershipNoChanges();
  }
  for (const role of roles) assertRoleAllowedForActor(authority, role);
}

@Injectable()
export class ScanlationGroupMemberManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupAuthorization: ScanlationGroupAuthorizationService,
  ) {}

  async list(
    slug: string,
    actorUserId: string,
    query: ScanlationGroupMembersQueryDto,
  ): Promise<ScanlationGroupMembersResponseDto> {
    const authority =
      await this.groupAuthorization.assertCanManageVerifiedGroupBySlug(
        slug,
        actorUserId,
      );
    const where: Prisma.ScanlationGroupMemberWhereInput = {
      groupId: authority.groupId,
      status: {
        in: [
          ScanlationGroupMemberStatus.ACTIVE,
          ScanlationGroupMemberStatus.SUSPENDED,
        ],
      },
      leftAt: null,
    };
    const [total, members] = await this.prisma.$transaction([
      this.prisma.scanlationGroupMember.count({ where }),
      this.prisma.scanlationGroupMember.findMany({
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

  addMember(
    slug: string,
    username: string,
    roles: ScanlationGroupRole[],
    auth: AuthenticatedRequestContext,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);
    const usernameNormalized = normalizeAuthUsername(username);

    return this.runSerializable(async (tx) => {
      const authority =
        await this.groupAuthorization.assertCanManageVerifiedGroupBySlug(
          slug,
          actorUserId,
          tx,
        );
      await this.lockActorAuthority(tx, authority);
      assertInitialRoles(authority, roles);

      const targetUser = await tx.user.findUnique({
        where: { usernameNormalized },
        select: { id: true, status: true },
      });
      if (!targetUser || targetUser.status !== UserStatus.ACTIVE) {
        throw scanlationGroupMemberAccountIneligible();
      }
      if (targetUser.id === actorUserId) {
        throw scanlationGroupMemberTargetForbidden();
      }

      const existing = await tx.scanlationGroupMember.findFirst({
        where: {
          groupId: authority.groupId,
          userId: targetUser.id,
          leftAt: null,
        },
        select: { id: true },
      });
      if (existing) throw scanlationGroupOpenMembershipConflict();

      const member = await tx.scanlationGroupMember.create({
        data: {
          groupId: authority.groupId,
          userId: targetUser.id,
          status: ScanlationGroupMemberStatus.ACTIVE,
          leftAt: null,
          roles: { create: roles.map((role) => ({ role })) },
        },
        select: managedMemberResponseSelect,
      });
      return { member: toManagedMemberDto(member) };
    }, scanlationGroupOpenMembershipConflict);
  }

  addRole(
    slug: string,
    membershipId: string,
    role: ScanlationGroupRole,
    auth: AuthenticatedRequestContext,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.changeRole(slug, membershipId, role, auth, 'add');
  }

  removeRole(
    slug: string,
    membershipId: string,
    role: ScanlationGroupRole,
    auth: AuthenticatedRequestContext,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.changeRole(slug, membershipId, role, auth, 'remove');
  }

  suspend(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.changeLifecycle(slug, membershipId, auth, 'suspend');
  }

  restore(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.changeLifecycle(slug, membershipId, auth, 'restore');
  }

  remove(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    return this.changeLifecycle(slug, membershipId, auth, 'remove');
  }

  private changeRole(
    slug: string,
    membershipId: string,
    role: ScanlationGroupRole,
    auth: AuthenticatedRequestContext,
    kind: 'add' | 'remove',
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);

    return this.runSerializable(
      async (tx) => {
        const authority =
          await this.groupAuthorization.assertCanManageVerifiedGroupBySlug(
            slug,
            actorUserId,
            tx,
          );
        await this.lockActorAuthority(tx, authority);
        const target = await this.getTarget(
          tx,
          authority.groupId,
          membershipId,
        );
        assertTargetAuthority(authority, actorUserId, target);
        assertRoleAllowedForActor(authority, role);
        if (target.status !== ScanlationGroupMemberStatus.ACTIVE) {
          throw scanlationGroupMembershipInvalidState();
        }
        if (target.user.status !== UserStatus.ACTIVE) {
          throw scanlationGroupMemberAccountIneligible();
        }

        const targetRoles = rolesOf(target);
        if (kind === 'add' && targetRoles.includes(role)) {
          throw scanlationGroupMembershipNoChanges();
        }
        if (kind === 'remove' && !targetRoles.includes(role)) {
          throw scanlationGroupMembershipNoChanges();
        }
        if (kind === 'remove' && targetRoles.length === 1) {
          throw scanlationGroupMemberRoleRequired();
        }

        await this.lockActiveEligibleTarget(tx, authority.groupId, target.id);
        if (kind === 'add') {
          await tx.scanlationGroupMemberRole.create({
            data: { membershipId: target.id, role },
          });
        } else {
          const removed = await tx.scanlationGroupMemberRole.deleteMany({
            where: { membershipId: target.id, role },
          });
          if (removed.count !== 1) throw scanlationGroupMembershipConflict();
        }

        return this.getResponse(tx, target.id);
      },
      kind === 'add' ? scanlationGroupMembershipNoChanges : undefined,
    );
  }

  private changeLifecycle(
    slug: string,
    membershipId: string,
    auth: AuthenticatedRequestContext,
    kind: LifecycleKind,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    const actorUserId = assertActiveMutationActor(auth);

    return this.runSerializable(async (tx) => {
      const authority =
        await this.groupAuthorization.assertCanManageVerifiedGroupBySlug(
          slug,
          actorUserId,
          tx,
        );
      await this.lockActorAuthority(tx, authority);
      const target = await this.getTarget(tx, authority.groupId, membershipId);
      assertTargetAuthority(authority, actorUserId, target);

      const where: Prisma.ScanlationGroupMemberWhereInput = {
        id: target.id,
        groupId: authority.groupId,
        status: target.status,
        leftAt: null,
      };
      const data: Prisma.ScanlationGroupMemberUpdateManyMutationInput = {};

      if (kind === 'suspend') {
        if (target.status !== ScanlationGroupMemberStatus.ACTIVE) {
          throw scanlationGroupMembershipInvalidState();
        }
        data.status = ScanlationGroupMemberStatus.SUSPENDED;
      } else if (kind === 'restore') {
        if (target.status !== ScanlationGroupMemberStatus.SUSPENDED) {
          throw scanlationGroupMembershipInvalidState();
        }
        if (target.user.status !== UserStatus.ACTIVE) {
          throw scanlationGroupMemberAccountIneligible();
        }
        where.user = { status: UserStatus.ACTIVE };
        data.status = ScanlationGroupMemberStatus.ACTIVE;
      } else {
        if (
          target.status !== ScanlationGroupMemberStatus.ACTIVE &&
          target.status !== ScanlationGroupMemberStatus.SUSPENDED
        ) {
          throw scanlationGroupMembershipInvalidState();
        }
        data.status = ScanlationGroupMemberStatus.REMOVED;
        data.leftAt = new Date();
      }

      const updated = await tx.scanlationGroupMember.updateMany({
        where,
        data,
      });
      if (updated.count !== 1) throw scanlationGroupMembershipConflict();
      return this.getResponse(tx, target.id);
    });
  }

  private async getTarget(
    tx: Prisma.TransactionClient,
    groupId: string,
    membershipId: string,
  ): Promise<ManagedMemberState> {
    const target = await tx.scanlationGroupMember.findFirst({
      where: { id: membershipId, groupId },
      select: managedMemberStateSelect,
    });
    if (!target) throw scanlationGroupMemberNotFound();
    return target;
  }

  private async lockActorAuthority(
    tx: Prisma.TransactionClient,
    authority: VerifiedGroupManagementAuthority,
  ): Promise<void> {
    if (!authority.membershipId) throw scanlationGroupMembershipConflict();
    const locked = await tx.scanlationGroupMember.updateMany({
      where: {
        id: authority.membershipId,
        groupId: authority.groupId,
        status: ScanlationGroupMemberStatus.ACTIVE,
        leftAt: null,
      },
      data: { status: ScanlationGroupMemberStatus.ACTIVE },
    });
    if (locked.count !== 1) throw scanlationGroupMembershipConflict();
  }

  private async lockActiveEligibleTarget(
    tx: Prisma.TransactionClient,
    groupId: string,
    membershipId: string,
  ): Promise<void> {
    const locked = await tx.scanlationGroupMember.updateMany({
      where: {
        id: membershipId,
        groupId,
        status: ScanlationGroupMemberStatus.ACTIVE,
        leftAt: null,
        user: { status: UserStatus.ACTIVE },
      },
      data: { status: ScanlationGroupMemberStatus.ACTIVE },
    });
    if (locked.count !== 1) throw scanlationGroupMembershipConflict();
  }

  private async getResponse(
    tx: Prisma.TransactionClient,
    membershipId: string,
  ): Promise<ScanlationGroupMemberManagementResponseDto> {
    const member = await tx.scanlationGroupMember.findUnique({
      where: { id: membershipId },
      select: managedMemberResponseSelect,
    });
    if (!member) throw scanlationGroupMemberNotFound();
    return { member: toManagedMemberDto(member) };
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    uniqueConflict?: () => Error,
  ): Promise<T> {
    for (let attempt = 1; attempt <= SERIALIZABLE_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (isUniqueConflict(error) && uniqueConflict) throw uniqueConflict();
        if (!isSerializableConflict(error)) throw error;
        if (attempt === SERIALIZABLE_MAX_ATTEMPTS) {
          throw scanlationGroupMembershipConflict();
        }
      }
    }
    throw scanlationGroupMembershipConflict();
  }
}
