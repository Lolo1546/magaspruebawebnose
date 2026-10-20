import { Injectable } from '@nestjs/common';
import {
  AdministrativeAuditActionType,
  Prisma,
  UserStatus,
} from '../../generated/prisma/client.js';
import {
  isKnownGlobalPermission,
  type GlobalPermission,
} from '../authorization/global-permissions.js';
import {
  GLOBAL_ROLE_KEYS,
  type GlobalRoleKey,
} from '../authorization/global-role-keys.js';

type RoleAuditMetadata = {
  v: 1;
  roleKey: GlobalRoleKey;
};

type PermissionAuditMetadata = {
  v: 1;
  permissionKey: GlobalPermission;
};

type SuspensionAuditMetadata = {
  v: 1;
  fromStatus: typeof UserStatus.ACTIVE;
  toStatus: typeof UserStatus.SUSPENDED;
};

type RestorationAuditMetadata = {
  v: 1;
  fromStatus: typeof UserStatus.SUSPENDED;
  toStatus: typeof UserStatus.ACTIVE;
};

type AdministrativeAuditInputByAction = {
  [AdministrativeAuditActionType.GLOBAL_ROLE_GRANTED]: RoleAuditMetadata;
  [AdministrativeAuditActionType.GLOBAL_ROLE_REVOKED]: RoleAuditMetadata;
  [AdministrativeAuditActionType.GLOBAL_PERMISSION_GRANTED]: PermissionAuditMetadata;
  [AdministrativeAuditActionType.GLOBAL_PERMISSION_REVOKED]: PermissionAuditMetadata;
  [AdministrativeAuditActionType.USER_SUSPENDED]: SuspensionAuditMetadata;
  [AdministrativeAuditActionType.USER_RESTORED]: RestorationAuditMetadata;
};

export type AdministrativeAuditEventInput = {
  [Action in AdministrativeAuditActionType]: {
    actorUserId: string;
    targetUserId: string;
    actionType: Action;
    reason: string;
    metadata: AdministrativeAuditInputByAction[Action];
  };
}[AdministrativeAuditActionType];

export type AdministrativeAuditTransaction = {
  administrativeAuditEvent: {
    create(args: Prisma.AdministrativeAuditEventCreateArgs): Promise<{
      id: string;
    }>;
  };
};

export class AdministrativeAuditInputError extends Error {
  readonly code = 'ADMINISTRATIVE_AUDIT_INPUT_INVALID';

  constructor() {
    super('Administrative audit input is invalid.');
    this.name = 'AdministrativeAuditInputError';
  }
}

const knownGlobalRoles = new Set<string>(Object.values(GLOBAL_ROLE_KEYS));

function normalizeReason(reason: string): string {
  if (typeof reason !== 'string') throw new AdministrativeAuditInputError();
  const normalized = reason.trim();
  if (normalized.length < 1 || normalized.length > 2000) {
    throw new AdministrativeAuditInputError();
  }
  return normalized;
}

function normalizeMetadata(
  input: AdministrativeAuditEventInput,
): Prisma.InputJsonObject {
  if (input.metadata.v !== 1) throw new AdministrativeAuditInputError();

  switch (input.actionType) {
    case AdministrativeAuditActionType.GLOBAL_ROLE_GRANTED:
    case AdministrativeAuditActionType.GLOBAL_ROLE_REVOKED:
      if (!knownGlobalRoles.has(input.metadata.roleKey)) {
        throw new AdministrativeAuditInputError();
      }
      return { v: 1, roleKey: input.metadata.roleKey };
    case AdministrativeAuditActionType.GLOBAL_PERMISSION_GRANTED:
    case AdministrativeAuditActionType.GLOBAL_PERMISSION_REVOKED:
      if (!isKnownGlobalPermission(input.metadata.permissionKey)) {
        throw new AdministrativeAuditInputError();
      }
      return { v: 1, permissionKey: input.metadata.permissionKey };
    case AdministrativeAuditActionType.USER_SUSPENDED:
      if (
        input.metadata.fromStatus !== UserStatus.ACTIVE ||
        input.metadata.toStatus !== UserStatus.SUSPENDED
      ) {
        throw new AdministrativeAuditInputError();
      }
      return {
        v: 1,
        fromStatus: UserStatus.ACTIVE,
        toStatus: UserStatus.SUSPENDED,
      };
    case AdministrativeAuditActionType.USER_RESTORED:
      if (
        input.metadata.fromStatus !== UserStatus.SUSPENDED ||
        input.metadata.toStatus !== UserStatus.ACTIVE
      ) {
        throw new AdministrativeAuditInputError();
      }
      return {
        v: 1,
        fromStatus: UserStatus.SUSPENDED,
        toStatus: UserStatus.ACTIVE,
      };
  }
}

@Injectable()
export class AdministrativeAuditWriter {
  async write(
    transaction: AdministrativeAuditTransaction,
    input: AdministrativeAuditEventInput,
  ): Promise<{ id: string }> {
    const reason = normalizeReason(input.reason);
    const metadata = normalizeMetadata(input);

    return transaction.administrativeAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId,
        actionType: input.actionType,
        reason,
        metadata,
      },
      select: { id: true },
    });
  }
}
