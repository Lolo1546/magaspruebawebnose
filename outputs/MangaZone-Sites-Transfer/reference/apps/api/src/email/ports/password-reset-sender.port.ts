export const PASSWORD_RESET_SENDER = Symbol('PASSWORD_RESET_SENDER');

export interface PasswordResetDelivery {
  email: string;
  token: string;
  expiresAt: Date;
  passwordResetTokenId: string;
}

export interface PasswordResetSender {
  sendPasswordResetEmail(input: PasswordResetDelivery): Promise<void>;
}
