import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { editorialConflict } from './editorial.errors.js';

export function isRetryableSerializableConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034';
  }
  if (!(error instanceof Error) || error.name !== 'DriverAdapterError') {
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

export async function runEditorialSerializableTransaction<T>(
  prisma: Pick<PrismaService, '$transaction'>,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableSerializableConflict(error)) throw error;
      if (attempt === 2) throw editorialConflict();
    }
  }
  throw editorialConflict();
}
