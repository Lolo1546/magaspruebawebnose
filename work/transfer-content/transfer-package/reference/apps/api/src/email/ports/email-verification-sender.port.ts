export const EMAIL_VERIFICATION_SENDER = Symbol('EMAIL_VERIFICATION_SENDER');

export interface VerificationDelivery {
  email: string;
  token: string;
  expiresAt: Date;
  verificationTokenId: string;
}

export interface EmailVerificationSender {
  sendVerificationEmail(input: VerificationDelivery): Promise<void>;
}
