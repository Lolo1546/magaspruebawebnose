import { normalizeCreationRequestName } from '../creation-requests/creation-request-name-normalizer.js';

// Matches editorial_normalize_title: Unicode uppercase and collapsed ECMAScript whitespace.
export function normalizeEditorialTitle(title: string): string {
  return normalizeCreationRequestName(title);
}
