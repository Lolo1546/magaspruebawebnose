import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

function isSerializableConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  ) {
    return true;
  }

  if (typeof error !== 'object' || error === null || !('cause' in error)) {
    return false;
  }
  const cause = error.cause;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'originalCode' in cause &&
    cause.originalCode === '40001' &&
    'kind' in cause &&
    cause.kind === 'TransactionWriteConflict'
  );
}

export async function runCreationRequestSerializableTransaction<T>(
  prisma: Pick<PrismaService, '$transaction'>,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializableConflict(error)) throw error;
      if (attempt === SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS) {
        throw new ConflictException({
          statusCode: 409,
          code: 'CREATION_REQUEST_CONFLICT',
          message:
            'La solicitud no pudo registrarse por un conflicto concurrente.',
        });
      }
    }
  }

  throw new Error('Unreachable creation request transaction state.');
}
