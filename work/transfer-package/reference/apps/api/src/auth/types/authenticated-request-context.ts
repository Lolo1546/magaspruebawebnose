import type { UserStatus } from '../../../generated/prisma/client.js';

export type AuthenticatedRequestContext = {
  userId: string;
  userStatus: UserStatus;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
};
