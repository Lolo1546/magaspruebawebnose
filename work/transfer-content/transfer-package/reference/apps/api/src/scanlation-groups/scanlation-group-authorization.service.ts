import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ScanlationGroupMemberStatus,
  ScanlationGroupRole,
  ScanlationGroupStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SelfScanlationGroupMembershipsResponseDto } from './dto/scanlation-group-membership-response.dto.js';

export const ACTIVE_SCANLATION_GROUP_MEMBERSHIP_WHERE = {
  status: ScanlationGroupMemberStatus.ACTIVE,
  leftAt: null,
} as const;

type ScanlationGroupMembershipState = {
  id: string;
  status: ScanlationGroupMemberStatus;
  leftAt: Date | null;
  roles: Array<{ role: ScanlationGroupRole }>;
};

export interface ScanlationGroupAuthority {
  membershipId: string | null;
  roles: ScanlationGroupRole[];
  isFounder: boolean;
  isAdmin: boolean;
  canAdministerGroup: boolean;
}

export interface VerifiedGroupManagementAuthority extends ScanlationGroupAuthority {
  groupId: string;
}

type ScanlationGroupAuthorityClient = Pick<
  Prisma.TransactionClient,
  'scanlationGroup' | 'scanlationGroupMember'
>;

function isActiveOpenMembership(
  membership: ScanlationGroupMembershipState | null,
): membership is ScanlationGroupMembershipState {
  return (
    membership?.status === ScanlationGroupMemberStatus.ACTIVE &&
    membership.leftAt === null
  );
}

function denyScanlationGroupAuthority(): never {
  throw new ForbiddenException({
    statusCode: 403,
    code: 'DOMAIN_AUTHORIZATION_DENIED',
    message: 'Operación no permitida.',
  });
}

function scanlationGroupNotFound(): never {
  throw new NotFoundException({
    statusCode: 404,
    code: 'SCANLATION_GROUP_NOT_FOUND',
    message: 'Grupo de scanlation no encontrado.',
  });
}

function toAuthority(
  membership: ScanlationGroupMembershipState | null,
): ScanlationGroupAuthority {
  const activeMembership = isActiveOpenMembership(membership)
    ? membership
    : null;
  const roles = activeMembership?.roles.map(({ role }) => role) ?? [];
  const isFounder = roles.includes(ScanlationGroupRole.FOUNDER);
  const isAdmin = roles.includes(ScanlationGroupRole.ADMIN);

  return {
    membershipId: activeMembership?.id ?? null,
    roles,
    isFounder,
    isAdmin,
    canAdministerGroup: isFounder || isAdmin,
  };
}

@Injectable()
export class ScanlationGroupAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActiveMembership(groupId: string, userId: string) {
    const membership = await this.prisma.scanlationGroupMember.findFirst({
      where: {
        groupId,
        userId,
        ...ACTIVE_SCANLATION_GROUP_MEMBERSHIP_WHERE,
      },
      select: {
        id: true,
        status: true,
        leftAt: true,
        roles: {
          orderBy: { role: 'asc' },
          select: { role: true },
        },
      },
    });

    return isActiveOpenMembership(membership) ? membership : null;
  }

  async resolveAuthority(
    groupId: string,
    actorUserId: string,
  ): Promise<ScanlationGroupAuthority> {
    const membership = await this.resolveActiveMembership(groupId, actorUserId);
    return toAuthority(membership);
  }

  async assertCanManageVerifiedGroupBySlug(
    slug: string,
    actorUserId: string,
    client: ScanlationGroupAuthorityClient = this.prisma,
  ): Promise<VerifiedGroupManagementAuthority> {
    const group = await client.scanlationGroup.findFirst({
      where: { slug, status: ScanlationGroupStatus.VERIFIED },
      select: {
        id: true,
        members: {
          where: {
            userId: actorUserId,
            ...ACTIVE_SCANLATION_GROUP_MEMBERSHIP_WHERE,
          },
          take: 1,
          select: {
            id: true,
            status: true,
            leftAt: true,
            roles: {
              orderBy: { role: 'asc' },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!group) scanlationGroupNotFound();
    const authority = toAuthority(group.members[0] ?? null);
    if (!authority.canAdministerGroup) denyScanlationGroupAuthority();

    return { ...authority, groupId: group.id };
  }

  async assertGroupFounder(
    groupId: string,
    actorUserId: string,
  ): Promise<ScanlationGroupAuthority> {
    const authority = await this.resolveAuthority(groupId, actorUserId);

    if (!authority.isFounder) {
      denyScanlationGroupAuthority();
    }

    return authority;
  }

  async assertCanAdministerGroup(
    groupId: string,
    actorUserId: string,
  ): Promise<ScanlationGroupAuthority> {
    const authority = await this.resolveAuthority(groupId, actorUserId);

    if (!authority.canAdministerGroup) {
      denyScanlationGroupAuthority();
    }

    return authority;
  }

  async getSelfMemberships(
    userId: string,
  ): Promise<SelfScanlationGroupMembershipsResponseDto> {
    const memberships = await this.prisma.scanlationGroupMember.findMany({
      where: {
        userId,
        ...ACTIVE_SCANLATION_GROUP_MEMBERSHIP_WHERE,
      },
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        joinedAt: true,
        leftAt: true,
        group: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        roles: {
          orderBy: { role: 'asc' },
          select: { role: true },
        },
      },
    });

    return {
      items: memberships.map((membership) => ({
        membershipId: membership.id,
        group: membership.group,
        status: membership.status,
        roles: membership.roles.map(({ role }) => role),
        joinedAt: membership.joinedAt.toISOString(),
        leftAt: membership.leftAt?.toISOString() ?? null,
      })),
    };
  }
}
