export const COMMUNITY_SLUG_CANDIDATE_LIMIT = 100;

function stableRequestFragment(requestId: string): string {
  const fragment = requestId.replace(/[^a-zA-Z0-9]/g, '').slice(-12);
  return fragment.toLowerCase() || 'request';
}

export function createCommunitySlugBase(
  proposedName: string,
  requestId: string,
): string {
  const slug = proposedName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `community-${stableRequestFragment(requestId)}`;
}

export function createCommunitySlugCandidates(
  base: string,
  limit = COMMUNITY_SLUG_CANDIDATE_LIMIT,
): string[] {
  if (!Number.isInteger(limit) || limit < 1) return [];

  return Array.from({ length: limit }, (_, index) =>
    index === 0 ? base : `${base}-${index + 1}`,
  );
}
