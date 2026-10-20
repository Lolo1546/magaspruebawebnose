import { Injectable } from '@nestjs/common';
import { UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  accountNotEligible,
  insufficientPermission,
} from './authorization.errors.js';
import {
  isKnownGlobalPermission,
  KNOWN_GLOBAL_PERMISSIONS,
  type GlobalPermission,
} from './global-permissions.js';
import { GLOBAL_ROLE_KEYS } from './global-role-keys.js';

@Injectable()
export class GlobalAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        roles: {
          where: { role: { key: GLOBAL_ROLE_KEYS.ADMIN } },
          select: { roleId: true },
          take: 1,
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw accountNotEligible();
    }
    if (user.roles.length === 0) {
      throw insufficientPermission();
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const effectivePermissions = await this.resolveEffectivePermissions(userId);
    return (
      isKnownGlobalPermission(permission) &&
      effectivePermissions.has(permission)
    );
  }

  async assertPermission(
    userId: string,
    permission: GlobalPermission,
  ): Promise<void> {
    await this.assertPermissions(userId, [permission]);
  }

  async assertPermissions(
    userId: string,
    permissions: readonly GlobalPermission[],
  ): Promise<void> {
    const effectivePermissions = await this.resolveEffectivePermissions(userId);

    if (
      permissions.length === 0 ||
      !permissions.every((permission) => effectivePermissions.has(permission))
    ) {
      throw insufficientPermission();
    }
  }

  private async resolveEffectivePermissions(
    userId: string,
  ): Promise<Set<GlobalPermission>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        roles: {
          select: {
            role: {
              select: {
                key: true,
                rolePermissions: {
                  select: {
                    permission: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
        permissionGrants: {
          select: {
            permission: { select: { key: true } },
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw accountNotEligible();
    }

    const effectivePermissions = new Set<GlobalPermission>();
    const isAdmin = user.roles.some(
      ({ role }) => role.key === GLOBAL_ROLE_KEYS.ADMIN,
    );

    if (isAdmin) {
      for (const permission of KNOWN_GLOBAL_PERMISSIONS) {
        effectivePermissions.add(permission);
      }
    }

    for (const { role } of user.roles) {
      for (const { permission } of role.rolePermissions) {
        if (isKnownGlobalPermission(permission.key)) {
          effectivePermissions.add(permission.key);
        }
      }
    }

    for (const { permission } of user.permissionGrants) {
      if (isKnownGlobalPermission(permission.key)) {
        effectivePermissions.add(permission.key);
      }
    }

    return effectivePermissions;
  }
}
