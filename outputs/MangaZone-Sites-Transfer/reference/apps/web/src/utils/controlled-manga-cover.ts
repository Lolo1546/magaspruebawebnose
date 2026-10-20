// Only the configured public API origin and the server-owned cover route bypass
// Next's shared optimizer. This is routing policy, never authorization.
export function isControlledMangaCover(
  src: unknown,
  apiOrigin = process.env.NEXT_PUBLIC_API_URL,
): boolean {
  if (typeof src !== "string" || !apiOrigin) return false;
  const originSyntax = /^https?:\/\/[^/\\\s?#]+\/?$/i;
  if (!originSyntax.test(apiOrigin)) return false;
  try {
    const trusted = new URL(apiOrigin);
    const url = new URL(src);
    return (
      !trusted.username && !trusted.password &&
      url.origin === trusted.origin &&
      src === `${url.origin}${url.pathname}` &&
      /^\/media\/mangas\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/cover$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}
