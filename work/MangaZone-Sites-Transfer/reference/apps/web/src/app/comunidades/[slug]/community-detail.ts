export function createCommunityDetailHref(slug: string, postsPage: number): string {
  const path = `/comunidades/${encodeURIComponent(slug)}`;
  if (postsPage === 1) return path;
  const params = new URLSearchParams({ postsPage: String(postsPage) });
  return `${path}?${params.toString()}`;
}
