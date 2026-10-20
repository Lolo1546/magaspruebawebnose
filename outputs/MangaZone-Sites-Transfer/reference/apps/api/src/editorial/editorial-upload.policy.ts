import { EditorialUploadState } from '../../generated/prisma/client.js';

// COVER only; PAGE and future purposes must define their own policy.
export const COVER_MAX_BYTES = 10_485_760;
export const COVER_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const COVER_INTENT_TTL_SECONDS = 300;

export function isPendingUploadIntent(
  intent: {
    state: EditorialUploadState;
    expiresAt: Date;
  },
  now: Date,
): boolean {
  return (
    intent.state === EditorialUploadState.PENDING && intent.expiresAt > now
  );
}
