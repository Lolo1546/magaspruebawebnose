import { ForbiddenException } from '@nestjs/common';
import { UserStatus } from '../../generated/prisma/client.js';
import type { AuthenticatedRequestContext } from './types/authenticated-request-context.js';

export function assertActiveMutationActor(
  auth: Pick<AuthenticatedRequestContext, 'userId' | 'userStatus'>,
): string {
  if (auth.userStatus !== UserStatus.ACTIVE) {
    throw new ForbiddenException({
      statusCode: 403,
      code: 'ACCOUNT_NOT_ELIGIBLE',
      message: 'La cuenta no es elegible para esta operación.',
    });
  }

  return auth.userId;
}
