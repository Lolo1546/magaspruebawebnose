import { Injectable } from '@nestjs/common';
import {
  Prisma,
  UserStatus,
  ScanlationGroupRole,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GLOBAL_PERMISSIONS } from '../authorization/global-permissions.js';
import { GLOBAL_ROLE_KEYS } from '../authorization/global-role-keys.js';
import {
  accountNotEligible,
  insufficientPermission,
} from '../authorization/authorization.errors.js';
import { editorialNotFound, editorialConflict } from './editorial.errors.js';

export type EditorialCapability =
  'view' | 'prepare' | 'upload' | 'publish' | 'withdraw';

function operationalRoles(
  capability: EditorialCapability,
): ScanlationGroupRole[] {
  return capability === 'publish' || capability === 'withdraw'
    ? [ScanlationGroupRole.FOUNDER, ScanlationGroupRole.ADMIN]
    : [
        ScanlationGroupRole.FOUNDER,
        ScanlationGroupRole.ADMIN,
        ScanlationGroupRole.UPLOADER,
      ];
}
type EditorialClient = Pick<
  Prisma.TransactionClient,
  | 'user'
  | 'scanlationProject'
  | 'scanlationGroup'
  | 'scanlationGroupMember'
  | 'projectGroup'
>;

@Injectable()
export class EditorialAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(userId: string, tx: EditorialClient) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        roles: {
          select: {
            role: {
              select: {
                key: true,
                rolePermissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
        permissionGrants: { select: { permission: { select: { key: true } } } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) throw accountNotEligible();
    return user;
  }

  async assertAdmin(
    userId: string,
    tx: EditorialClient = this.prisma,
  ): Promise<void> {
    const user = await this.actor(userId, tx);
    if (!user.roles.some(({ role }) => role.key === GLOBAL_ROLE_KEYS.ADMIN))
      throw insufficientPermission();
  }

  async assertCatalogManager(
    userId: string,
    tx: EditorialClient = this.prisma,
  ): Promise<void> {
    if (!(await this.hasCatalogAuthority(userId, tx)))
      throw insufficientPermission();
  }

  private async hasCatalogAuthority(
    userId: string,
    tx: EditorialClient,
  ): Promise<boolean> {
    const user = await this.actor(userId, tx);
    return (
      user.roles.some(
        ({ role }) =>
          role.key === GLOBAL_ROLE_KEYS.ADMIN ||
          role.rolePermissions.some(
            ({ permission }) =>
              permission.key === GLOBAL_PERMISSIONS.CATALOG_MANAGE,
          ),
      ) ||
      user.permissionGrants.some(
        ({ permission }) =>
          permission.key === GLOBAL_PERMISSIONS.CATALOG_MANAGE,
      )
    );
  }

  async assertMangaCoverReader(userId: string, mangaId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (await this.hasCatalogAuthority(userId, tx)) return;
      const scope = await this.projectReadScope(userId, tx);
      const project = await tx.scanlationProject.findFirst({
        where: { mangaId, ...scope },
        select: { id: true },
      });
      if (!project) throw insufficientPermission();
    });
  }

  // Scope is applied in SQL to both count and rows, never by filtering a page in JS.
  async projectReadScope(
    userId: string,
    tx: EditorialClient = this.prisma,
  ): Promise<Prisma.ScanlationProjectWhereInput> {
    const user = await this.actor(userId, tx);
    if (user.roles.some(({ role }) => role.key === GLOBAL_ROLE_KEYS.ADMIN))
      return {};
    return {
      status: 'ACTIVE',
      manga: { contentRating: { not: 'ADULT' } },
      groups: {
        some: {
          status: 'ACTIVE',
          leftAt: null,
          group: {
            status: 'VERIFIED',
            members: {
              some: {
                userId,
                user: { status: 'ACTIVE' },
                status: 'ACTIVE',
                leftAt: null,
                roles: { some: { role: { in: operationalRoles('view') } } },
              },
            },
          },
        },
      },
    };
  }

  // Mutation callers must pass their transaction; this helper never authorizes from a session role.
  async assertPublishing(
    userId: string,
    projectId: string,
    groupId: string,
    capability: EditorialCapability,
    tx: EditorialClient = this.prisma,
  ): Promise<void> {
    const user = await this.actor(userId, tx);
    const isAdmin = user.roles.some(
      ({ role }) => role.key === GLOBAL_ROLE_KEYS.ADMIN,
    );
    const project = await tx.scanlationProject.findUnique({
      where: { id: projectId },
      select: { status: true, manga: { select: { contentRating: true } } },
    });
    const group = await tx.scanlationGroup.findUnique({
      where: { id: groupId },
      select: { status: true },
    });
    if (!project || !group) throw editorialNotFound();
    if (isAdmin && capability === 'withdraw') return;
    if (
      project.status !== 'ACTIVE' ||
      group.status !== 'VERIFIED' ||
      project.manga.contentRating === 'ADULT'
    ) {
      throw editorialConflict('EDITORIAL_RESOURCE_NOT_OPERATIONAL');
    }
    const participation = await tx.projectGroup.findFirst({
      where: { projectId, groupId, status: 'ACTIVE', leftAt: null },
      select: { id: true },
    });
    if (!participation) throw insufficientPermission();
    if (isAdmin) return;
    const member = await tx.scanlationGroupMember.findFirst({
      where: { groupId, userId, status: 'ACTIVE', leftAt: null },
      select: { roles: { select: { role: true } } },
    });
    const roles = member?.roles.map(({ role }) => role) ?? [];
    const permitted = operationalRoles(capability).some((role) =>
      roles.includes(role),
    );
    if (!permitted) throw insufficientPermission();
  }
}
