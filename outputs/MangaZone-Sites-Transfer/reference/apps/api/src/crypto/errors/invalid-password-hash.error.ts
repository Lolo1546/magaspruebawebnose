export class InvalidStoredPasswordHashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStoredPasswordHashError';
  }
}
