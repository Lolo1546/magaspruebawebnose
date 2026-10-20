export class StorageObjectError extends Error {
  constructor(readonly code: 'MISSING' | 'TOO_LARGE' | 'SIZE_MISMATCH') {
    super('Stored object could not be validated.');
  }
}

export class StorageObjectAlreadyExistsError extends Error {
  constructor() {
    super('Storage object already exists.');
  }
}
