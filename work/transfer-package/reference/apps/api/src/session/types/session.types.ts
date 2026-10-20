import type { UserStatus, Prisma } from '../../../generated/prisma/client.js';

export type CreateSessionInput = {
  userId: string;
  ipAddress?: string | null;
  userAgentSummary?: string | null;
};

export type CreatedSessionResult = {
  sessionToken: string;
  session: {
    id: string;
    userId: string;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    ipAddress: string | null;
    userAgentSummary: string | null;
  };
};

export type ValidatedSession = {
  sessionId: string;
  userId: string;
  userStatus: UserStatus;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
};

export type SessionSummary = {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  ipAddress: string | null;
  userAgentSummary: string | null;
};

export type SessionRevocationReason =
  | 'USER_LOGOUT'
  | 'GLOBAL_LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_DELETED'
  | 'ADMIN_ACTION';

export type SessionAuditContext = {
  ipAddress?: string | null;
  userAgentSummary?: string | null;
  reason?: SessionRevocationReason;
};

// Cliente transaccional exclusivo
export type TransactionClient = Prisma.TransactionClient;
