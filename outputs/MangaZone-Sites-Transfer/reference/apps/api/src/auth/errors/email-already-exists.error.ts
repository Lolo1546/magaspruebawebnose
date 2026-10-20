export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('El email ya está registrado.');
    this.name = 'EmailAlreadyExistsError';
  }
}
