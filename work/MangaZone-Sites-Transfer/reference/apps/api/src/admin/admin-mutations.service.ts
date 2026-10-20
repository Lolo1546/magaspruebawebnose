import { Injectable } from '@nestjs/common';
import {
  AdministrativeAuditActionType,
  Prisma,
  UserStatus,
  UserSanctionType,
} from '../../generated/prisma/client.js';
import { normalizeAuthUsername } from '../auth/identity/auth-identity-normalizer.js';
import {
  accountNotEligible,
  insufficientPermission,
} from '../authorization/authorization.errors.js';
import { isKnownGlobalPermission } from '../authorization/global-permissions.js';
import {
  GLOBAL_ROLE_KEYS,
  type GlobalRoleKey,
} from '../authorization/global-role-keys.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from '../session/session.service.js';
import {
  adminMutationConflict,
  adminPermissionAlreadyGranted,
  adminPermissionGrantToAdminForbidden,
  adminPermissionNotGranted,
  adminRoleAlreadyAssigned,
  adminRoleNotAssigned,
  adminSelfTargetForbidden,
  adminTargetInvalidStatus,
  adminUnknownPermission,
  adminUnknownRole,
  adminUserNotFound,
  adminSuspensionSanctionConflict,
} from './admin.errors.js';
import {
  AdminMapper,
  adminUserSelect,
  type AdminUserProjection,
} from './admin.mapper.js';
import { AdministrativeAuditWriter } from './administrative-audit.writer.js';
import type { AdminUserDetailDto } from './dto/admin-response.dto.js';
import { LastActiveAdminInvariant } from './last-active-admin.invariant.js';

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const knownGlobalRoles = new Set<string>(Object.values(GLOBAL_ROLE_KEYS));

type RoleMutation = 'grant' | 'revoke';
type PermissionMutation = 'grant' | 'revoke';

const targetStateSelect = {
  id: true,
  status: true,
  roles: { select: { role: { select: { key: true } } } },
} satisfies Prisma.UserSelect;

type TargetState = Prisma.UserGetPayload<{
  select: typeof targetStateSelect;
}>;

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

function isKnownGlobalRole(role: string): role is GlobalRoleKey {
  return knownGlobalRoles.has(role);
}

@Injectable()
export class AdminMutationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: AdminMapper,
    private readonly audit: AdministrativeAuditWriter,
    private readonly lastActiveAdmin: LastActiveAdminInvariant,
    private readonly sessions: SessionService,
  ) {}

  suspend(actorUserId: string, username: string, reason: string) {
    return this.mutateSuspension(actorUserId, username, reason, 'suspend');
  }

  restore(actorUserId: string, username: string, reason: string) {
    return this.mutateSuspension(actorUserId, username, reason, 'restore');
  }

  private async mutateSuspension(
    actorUserId: string,
    username: string,
    reason: string,
    command: 'suspend' | 'restore',
  ): Promise<AdminUserDetailDto> {
    const user = await this.runSerializable(async (transaction) => {
      await this.assertFreshAdmin(transaction, actorUserId);
      const target = await this.findTarget(transaction, username);
      this.assertNotSelf(actorUserId, target.id);
      const suspending = command === 'suspend';
      const fromStatus = suspending ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
      const toStatus = suspending ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
      if (target.status !== fromStatus) throw adminTargetInvalidStatus();

      const now = new Date();
      const activeSanctions = await transaction.userSanction.findMany({
        where: {
          userId: target.id,
          type: UserSanctionType.SUSPENSION,
          revokedAt: null,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: { id: true },
        take: 2,
      });
      if (
        suspending ? activeSanctions.length !== 0 : activeSanctions.length !== 1
      ) {
        throw adminSuspensionSanctionConflict();
      }
      if (
        suspending &&
        target.roles.some(({ role }) => role.key === GLOBAL_ROLE_KEYS.ADMIN)
      ) {
        await this.lastActiveAdmin.assertCanRemoveActiveAdmin(
          transaction,
          target.id,
        );
      }
      const changed = await transaction.user.updateMany({
        where: { id: target.id, status: fromStatus },
        data: { status: toStatus },
      });
      if (changed.count !== 1) throw adminMutationConflict();

      if (suspending) {
        await transaction.userSanction.create({
          data: {
            userId: target.id,
            type: UserSanctionType.SUSPENSION,
            issuedByUserId: actorUserId,
            reason: reason.trim(),
            startsAt: now,
          },
        });
        await this.sessions.revokeAllSessions(
          target.id,
          undefined,
          transaction,
        );
        await this.audit.write(transaction, {
          actorUserId,
          targetUserId: target.id,
          actionType: AdministrativeAuditActionType.USER_SUSPENDED,
          reason,
          metadata: {
            v: 1,
            fromStatus: UserStatus.ACTIVE,
            toStatus: UserStatus.SUSPENDED,
          },
        });
      } else {
        const revoked = await transaction.userSanction.updateMany({
          where: { id: activeSanctions[0].id, revokedAt: null },
          data: { revokedAt: now, revokedByUserId: actorUserId },
        });
        if (revoked.count !== 1) throw adminMutationConflict();
        await this.audit.write(transaction, {
          actorUserId,
          targetUserId: target.id,
          actionType: AdministrativeAuditActionType.USER_RESTORED,
          reason,
          metadata: {
            v: 1,
            fromStatus: UserStatus.SUSPENDED,
            toStatus: UserStatus.ACTIVE,
          },
        });
      }
      return this.readUpdatedUser(transaction, target.id);
    });
    return { user: this.mapper.user(user) };
  }

  grantRole(
    actorUserId: string,
    username: string,
    role: string,
    reason: string,
  ): Promise<AdminUserDetailDto> {
    return this.mutateRole(actorUserId, username, role, reason, 'grant');
  }

  revokeRole(
    actorUserId: string,
    username: string,
    role: string,
    reason: string,
  ): Promise<AdminUserDetailDto> {
    return this.mutateRole(actorUserId, username, role, reason, 'revoke');
  }

  grantPermission(
    actorUserId: string,
    username: string,
    permission: string,
    reason: string,
  ): Promise<AdminUserDetailDto> {
    return this.mutatePermission(
      actorUserId,
      username,
      permission,
      reason,
      'grant',
    );
  }

  revokePermission(
    actorUserId: string,
    username: string,
    permission: string,
    reason: string,
  ): Promise<AdminUserDetailDto> {
    return this.mutatePermission(
      actorUserId,
      username,
      permission,
      reason,
      'revoke',
    );
  }

  private async mutateRole(
    actorUserId: string,
    username: string,
    roleKey: string,
    reason: string,
    mutation: RoleMutation,
  ): Promise<AdminUserDetailDto> {
    if (!isKnownGlobalRole(roleKey)) throw adminUnknownRole();

    const user = await this.runSerializable(async (transaction) => {
      await this.assertFreshAdmin(transaction, actorUserId);
      const target = await this.findTarget(transaction, username);
      this.assertNotSelf(actorUserId, target.id);
      this.assertTargetStatus(target.status, mutation === 'grant');
      const role = await transaction.role.findUnique({
        where: { key: roleKey },
        select: { id: true },
      });
      if (!role) throw adminUnknownRole();

      if (mutation === 'grant') {
        const created = await transaction.userRole.createMany({
          data: {
            userId: target.id,
            roleId: role.id,
            assignedByUserId: actorUserId,
          },
          skipDuplicates: true,
        });
        if (created.count !== 1) throw adminRoleAlreadyAssigned();
        await this.audit.write(transaction, {
          actorUserId,
          targetUserId: target.id,
          actionType: AdministrativeAuditActionType.GLOBAL_ROLE_GRANTED,
          reason,
          metadata: { v: 1, roleKey },
        });
      } else {
        if (
          roleKey === GLOBAL_ROLE_KEYS.ADMIN &&
          target.status === UserStatus.ACTIVE
        ) {
          await this.lastActiveAdmin.assertCanRemoveActiveAdmin(
            transaction,
            target.id,
          );
        }
        const removed = await transaction.userRole.deleteMany({
          where: { userId: target.id, roleId: role.id },
        });
        if (removed.count !== 1) throw adminRoleNotAssigned();
        await this.audit.write(transaction, {
          actorUserId,
          targetUserId: target.id,
          actionType: AdministrativeAuditActionType.GLOBAL_ROLE_REVOKED,
          reason,
          metadata: { v: 1, roleKey },
        });
      }

      return this.readUpdatedUser(transaction, target.id);
    });

    return { user: this.mapper.user(user) };
  }

  private async mutatePermission(
    actorUserId: string,
    username: string,
    permissionKey: string,
    reason: string,
    mutation: PermissionMutation,
  ): Promise<AdminUserDetailDto> {
    if (!isKnownGlobalPermission(permissionKey)) {
      throw adminUnknownPermission();
    }

    const user = await this.runSerializable(async (transaction) => {
      await this.assertFreshAdmin(transaction, actorUserId);
      const target = await this.findTarget(transaction, username);
      this.assertNotSelf(actorUserId, target.id);
      this.assertTargetStatus(target.status, mutation === 'grant');
      const permission = await transaction.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true },
      });
      if (!permission) throw adminUnknownPermission();

      if (mutation === 'grant') {
        const targetIsAdmin = target.roles.some(
          ({ role }) => role.key === GLOBAL_ROLE_KEYS.ADMIN,
        );
        if (targetIsAdmin) throw adminPermissionGrantToAdminForbidden();
        const created = await transaction.userPermissionGrant.createMany({
          data: {
            userId: target.id,
            permissionId: permission.id,
            grantedByUserId: actorUserId,
          },
          skipDuplicates: true,
        });
        if (created.count !== 1) throw adminPermissionAlreadyGranted();
        await this.audit.write(transaction, {
          actorUserId,
          targetUserId: target.id,
          actionType: AdministrativeAuditActionType.GLOBAL_PERMISSION_GRANTED,
          reason,
          metadata: { v: 1, permissionKey },
        });
      } else {
        const removed = await transaction.userPermissionGrant.deleteMany({
          where: { userId: target.id, permissionId: permission.id },
        });
        if (removed.count !== 1) throw adminPermissionNotGranted();
        await this.audit.write(transaction, {
          actorUserId,
          targetUserId: target.id,
          actionType: AdministrativeAuditActionType.GLOBAL_PERMISSION_REVOKED,
          reason,
          metadata: { v: 1, permissionKey },
        });
      }

      return this.readUpdatedUser(transaction, target.id);
    });

    return { user: this.mapper.user(user) };
  }

  private async assertFreshAdmin(
    transaction: Prisma.TransactionClient,
    actorUserId: string,
  ): Promise<void> {
    const actor = await transaction.user.findUnique({
      where: { id: actorUserId },
      select: {
        status: true,
        roles: {
          where: { role: { key: GLOBAL_ROLE_KEYS.ADMIN } },
          select: { roleId: true },
          take: 1,
        },
      },
    });
    if (!actor || actor.status !== UserStatus.ACTIVE) {
      throw accountNotEligible();
    }
    if (actor.roles.length === 0) throw insufficientPermission();
  }

  private async findTarget(
    transaction: Prisma.TransactionClient,
    username: string,
  ): Promise<TargetState> {
    const target = await transaction.user.findFirst({
      where: { usernameNormalized: normalizeAuthUsername(username) },
      select: targetStateSelect,
    });
    if (!target) throw adminUserNotFound();
    return target;
  }

  private assertNotSelf(actorUserId: string, targetUserId: string): void {
    if (actorUserId === targetUserId) throw adminSelfTargetForbidden();
  }

  private assertTargetStatus(status: UserStatus, mustBeActive: boolean): void {
    if (
      (mustBeActive && status !== UserStatus.ACTIVE) ||
      (!mustBeActive && status === UserStatus.DELETED)
    ) {
      throw adminTargetInvalidStatus();
    }
  }

  private async readUpdatedUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<AdminUserProjection> {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: adminUserSelect,
    });
    if (!user) throw adminUserNotFound();
    return user;
  }

  private async runSerializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= SERIALIZABLE_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!isSerializableConflict(error)) throw error;
        if (attempt === SERIALIZABLE_MAX_ATTEMPTS) {
          throw adminMutationConflict();
        }
      }
    }
    throw adminMutationConflict();
  }
}
