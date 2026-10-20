export class UsernameAlreadyExistsError extends Error {
  constructor() {
    super('El nombre de usuario no está disponible.');
    this.name = 'UsernameAlreadyExistsError';
  }
}
