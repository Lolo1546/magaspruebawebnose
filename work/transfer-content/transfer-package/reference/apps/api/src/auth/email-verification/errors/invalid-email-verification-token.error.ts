export class InvalidEmailVerificationTokenError extends Error {
  constructor() {
    super('Token de verificación de correo electrónico inválido o expirado.');
    this.name = 'InvalidEmailVerificationTokenError';
  }
}
