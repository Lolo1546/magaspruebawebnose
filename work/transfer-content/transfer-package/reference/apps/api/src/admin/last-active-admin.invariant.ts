import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '../../generated/prisma/client.js';
import { GLOBAL_ROLE_KEYS } from '../authorization/global-role-keys.js';
import { lastActiveAdminRequired } from './admin.errors.js';

@Injectable()
export class LastActiveAdminInvariant {
  async assertCanRemoveActiveAdmin(
    transaction: Prisma.TransactionClient,
    targetUserId: string,
  ): Promise<void> {
    const remaining = await transaction.user.count({
      where: {
        id: { not: targetUserId },
        status: UserStatus.ACTIVE,
        roles: { some: { role: { key: GLOBAL_ROLE_KEYS.ADMIN } } },
      },
    });

    if (remaining < 1) throw lastActiveAdminRequired();
  }
}
