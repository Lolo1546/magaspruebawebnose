export class InvalidPasswordResetTokenError extends Error {
  constructor() {
    super('Token de recuperación de contraseña inválido o expirado.');
    this.name = 'InvalidPasswordResetTokenError';
  }
}
