export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas.');
    this.name = 'InvalidCredentialsError';
  }
}
