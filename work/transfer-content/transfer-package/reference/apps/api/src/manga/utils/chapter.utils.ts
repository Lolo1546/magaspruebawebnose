import { ChapterKind, Prisma } from '../../../generated/prisma/client.js';

/**
 * Checks if a string is a canonical numeric chapter representation.
 * Canonical: 0, 1, 12, 12.5, 0.5
 * Rejected: +1, -1, 1., .5, 01, 01.5, 12.50, 1e2, Infinity, NaN
 */
export function isCanonicalNumeric(value: string): boolean {
  return /^(0|[1-9]\d*)(?:\.\d*[1-9])?$/.test(value);
}

/**
 * Normalizes a Prisma Decimal to a canonical string representation.
 */
export function normalizeDecimal(decimal: Prisma.Decimal): string {
  // Prisma.Decimal (decimal.js) toString() produces canonical format without trailing zeros
  return decimal.toString();
}

/**
 * Generates the reader key for a chapter.
 */
export function generateReaderKey(
  kind: ChapterKind,
  number: Prisma.Decimal | null,
  id: string,
): string {
  if (kind === ChapterKind.REGULAR && number !== null) {
    return normalizeDecimal(number);
  }
  return id;
}
