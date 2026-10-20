import type { Prisma } from '../../../generated/prisma/client.js';

export type RequestPasswordResetInput = {
  email: string;
  ipAddress?: string | null;
  userAgentSummary?: string | null;
};

export type PasswordResetDelivery = {
  email: string;
  token: string;
  expiresAt: Date;
  passwordResetTokenId: string;
};

export type PasswordResetIssuedPersistence = (
  tx: Prisma.TransactionClient,
  delivery: PasswordResetDelivery,
) => Promise<void>;

export type RequestPasswordResetResult = {
  accepted: true;
};

export type IssuePasswordResetInput = {
  email: string;
  ipAddress?: string | null;
  userAgentSummary?: string | null;
};

export type CompletePasswordResetInput = {
  token: string;
  newPassword: string;
  ipAddress?: string | null;
  userAgentSummary?: string | null;
};

export type CompletePasswordResetResult = {
  completed: true;
};
