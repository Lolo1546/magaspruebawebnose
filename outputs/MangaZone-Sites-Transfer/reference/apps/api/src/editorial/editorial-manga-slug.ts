import { createHash } from 'node:crypto';

export const EDITORIAL_MANGA_SLUG_CANDIDATE_LIMIT = 100;

export function createEditorialMangaSlugBase(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug) return slug;
  const fragment = createHash('sha256')
    .update(title)
    .digest('hex')
    .slice(0, 12);
  return `manga-${fragment}`;
}

export function createEditorialMangaSlugCandidates(base: string): string[] {
  return Array.from(
    { length: EDITORIAL_MANGA_SLUG_CANDIDATE_LIMIT },
    (_, index) => (index === 0 ? base : `${base}-${index + 1}`),
  );
}
