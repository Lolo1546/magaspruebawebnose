export const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
export const THUMBNAIL_MAX_PIXELS = 8_000_000;
export const THUMBNAIL_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const THUMBNAIL_WINDOW_MS = 72 * 60 * 60 * 1000;

export type ThumbnailEntry = {
  groupId: string;
  firstPublishedAt: Date;
  currentlyEligible: boolean;
};

// Historical slots never disappear when current eligibility changes.
export function thumbnailWindows(entries: ThumbnailEntry[]) {
  let previousEnd = Number.NEGATIVE_INFINITY;
  return [...entries]
    .sort(
      (a, b) =>
        a.firstPublishedAt.getTime() - b.firstPublishedAt.getTime() ||
        (a.groupId < b.groupId ? -1 : a.groupId > b.groupId ? 1 : 0),
    )
    .map((entry) => {
      const start = Math.max(previousEnd, entry.firstPublishedAt.getTime());
      previousEnd = start + THUMBNAIL_WINDOW_MS;
      return {
        ...entry,
        startsAt: new Date(start),
        expiresAt: new Date(previousEnd),
      };
    });
}
