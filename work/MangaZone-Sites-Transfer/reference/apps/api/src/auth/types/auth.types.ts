import type { Prisma, UserStatus } from '../../../generated/prisma/client.js';
import type { VerificationDelivery } from '../../email/ports/email-verification-sender.port.js';

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgentSummary?: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgentSummary?: string | null;
};

export type AuthResult = {
  userId: string;
  userStatus: UserStatus;
  sessionToken: string;
  sessionId: string;
  sessionCreatedAt: Date;
  sessionExpiresAt: Date;
};

export type TransactionClient = Prisma.TransactionClient;

export interface RegistrationResult {
  auth: AuthResult;
  verificationDelivery: VerificationDelivery;
}
