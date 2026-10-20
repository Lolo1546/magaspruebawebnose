export function canonicalizeCreationRequestName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeCreationRequestName(value: string): string {
  return canonicalizeCreationRequestName(value).toUpperCase();
}
