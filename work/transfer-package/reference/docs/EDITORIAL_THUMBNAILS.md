# Chapter thumbnails (4.4D.1)

The optional current custom thumbnail belongs to Chapter, not ChapterRelease.
Without a custom thumbnail the response requests Manga-cover fallback; no asset
is copied or derived. No Web/public thumbnail route is introduced.

## Priority and authority

Historical first publication is the minimum non-null publishedAt for each
distinct responsible group, within a project of the same Manga. Retired releases
remain in this calculation. Legacy releases without a responsible group, project
or publication timestamp do not invent a historical entry.

Order is first publication ascending, then group UUID ascending. Each slot lasts
72 hours; start is max(previous slot end, first publication). Withdrawal never
removes a slot, advances another slot, pauses time or grants a new turn.
Replacement and later publication preserve the historical minimum.

Current eligibility is separate: at least one PUBLISHED release in an ACTIVE
project with ACTIVE ProjectGroup participation, VERIFIED group, ACTIVE Chapter
and non-ADULT Manga. An ACTIVE FOUNDER/group ADMIN may act only for their group.
UPLOADER, specialized roles, catalog.manage and moderator authority do not grant
thumbnail mutation rights. Global ACTIVE ADMIN can set/override independently.
All authorization is re-read from the database, not inferred from session roles.

The server clock is read as PostgreSQL epoch milliseconds, avoiding raw timestamp
timezone conversion by the driver. Returning eligibility recovers only any
remaining historical time; an expired window never renews.

## Private upload and association

CHAPTER_THUMBNAIL policy is 5,242,880 bytes and 8,000,000 pixels. JPEG, PNG and static
WebP only; real bounded bytes, exact declared size, MIME/container checks and full
Sharp decoding reject corrupt, animated and multi-frame inputs. COVER/PAGE limits
are unchanged. All purposes share the existing maximum of two active decodes.

The existing single-use finalize endpoint creates a READY asset without Chapter
association. Set/request/override later revalidate actor, Chapter, group, purpose,
finalized intent and READY asset. A user cannot attach another user's candidate;
ADMIN approval uses the candidate explicitly bound to the stored request.

Private preview redirects to a signed GET (existing 60-second TTL), with private
no-store, no-referrer and nosniff headers. Current images are readable to scoped
editorial viewers; unattached/proposed candidates only to their owner or ADMIN.
No raw object keys appear in application DTOs. Existing signed URLs can remain
usable until expiry; there is no public CDN or physical thumbnail generation.

## API

Base: /editorial/chapters/:chapterId/thumbnail

- GET base: current image/fallback, fixed state, current historical slot,
  eligibility and actor-group request capabilities.
- POST /upload-intents: contentType, expectedBytes, optional groupId (ADMIN may
  omit groupId); non-admin requires a currently authorized group.
- POST /set: assetId and groupId for group actors; only while not fixed.
- POST /requests: groupId, assetId; requires a fixed thumbnail and current group
  publication, not current priority.
- GET /requests?page=1: ADMIN only, stable createdAt DESC/id DESC, page size 50.
- POST /requests/:requestId/approve and /reject: ADMIN only, empty body.
- POST /override: ADMIN only, assetId.
- POST /editorial/uploads/intents/:intentId/finalize: existing shared finalize.
- GET /media/editorial/chapters/:chapterId/thumbnails/:assetId: private preview.

Writes use Session, Origin and CSRF guards and reject unknown body fields.
No ChapterRelease version changes occur.

## Transactions, history and concurrency

All association/request/resolution writes lock Chapter first. They then take
ordered shared locks on its releases, compatible with the existing publication
UUID lock order and preventing withdrawal of a checked publication until commit.
Publication takes no Chapter lock; its behavior and versions remain unchanged.
No storage/network calls occur in association transactions.

A partial unique index enforces one PENDING request per Chapter/group, in addition
to the Chapter lock. Different groups may have pending requests simultaneously.
Approve sets the candidate, records resolver/time, and supersedes every other
pending request atomically. Reject changes only its request. ADMIN override
supersedes all pending requests. A second approval sees SUPERSEDED and conflicts.
If approval commits before a concurrent override, both valid transitions remain
audited; if override wins first, approval conflicts. No silent lost update.

Audit records Chapter, actor, group where applicable, request, previous/proposed
asset and server timestamp. Historical assets are preserved, with restrictive
FKs. There is no hard deletion, cleanup job or release-version mutation.

Migration 023 only adds thumbnail schema and extends the two existing shape
constraints to admit its new context. Prior action/context alternatives are
preserved. No historical migration edits, data backfill or ledger repair.

## Verification boundary

Integration tests use real PostgreSQL, HTTP, session/CSRF guards and transactions,
with fake object transport. Five association/request races observe two blocked
HTTP transactions in PostgreSQL before releasing the coordination lock; winner
assertions correlate persisted assets, request states and audit rows. Image unit
tests use real Sharp decode. This does not claim validation against a live S3
provider; existing STORAGE_UPLOADS.md deployment checks remain necessary.
