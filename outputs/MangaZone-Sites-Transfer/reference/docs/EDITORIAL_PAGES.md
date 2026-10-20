# Draft release PAGE pipeline (4.4C)

The PAGE pipeline prepares DRAFT releases. Phase 4.4E also permits private
editorial inspection of pages on PUBLISHED and WITHDRAWN releases. It does not
change page mutation, publish, withdraw or replacement rules.

## Policy and authority

MANGA_PAGE uses 1..20,971,520 declared and real bytes, exact declared/real
equality, and at most 25,000,000 decoded pixels. MIME must match real static,
single-frame JPEG, PNG or WebP. APNG, animated WebP, multiple frames/pages,
corruption and other formats are rejected. Shared container checks and full
Sharp RGBA uchar decoding validate the original bytes without transforming them.
COVER remains independently limited to 10,485,760 bytes and 16,777,216 pixels.

The same per-process finalize semaphore permits at most two COVER/PAGE operations
combined; excess work receives UPLOAD_FINALIZE_BUSY, not an unbounded queue.
Two maximum PAGE raw outputs alone require about 190.7 MiB
(2 x 25,000,000 x 4 bytes), excluding compressed buffers, libvips and overhead.
Production capacity must include that overhead; concurrency is not increased.

ACTIVE global ADMIN, or FOUNDER/group ADMIN/UPLOADER with ACTIVE/open membership
and participation in the responsible VERIFIED group may prepare and preview.
Specialized-only, catalog.manage-only, moderator and unrelated users cannot.
The central editorial policy is reused and checked against current DB state.
Project must be ACTIVE, Manga non-ADULT and project/chapter/manga context must
match. Historical projectless releases are not eligible. Page mutations also
require Chapter ACTIVE and Release DRAFT. Private list/preview reads accept
Release DRAFT, PUBLISHED or WITHDRAWN; other states remain blocked.

## Routes

Base: /editorial/projects/:projectId/chapters/:chapterId/releases/:releaseId/pages

- POST base/upload-intents: body contentType and expectedBytes only. Returns
  intentId, method, signedUploadUrl, required headers and expiresAt (300 seconds).
  Actor, MANGA_PAGE purpose, release, temporary key and maxBytes are server-owned.
- POST /editorial/uploads/intents/:intentId/finalize: existing shared route,
  empty body. Dispatches by persisted purpose, never by client authority.
  PAGE success returns intentId, assetId, releaseId, pageId, pageNumber,
  version and finalizedAt. No storage key/hash/provider metadata.
- GET base: releaseId, version, pages with id, pageNumber, width, height,
  mimeType and a stable relative private previewUrl.
- PATCH base/order: expectedVersion and pageIds containing the entire exact set,
  no duplicates, omissions or foreign IDs. Empty is valid only for an empty
  release. Returns releaseId, incremented version and ordered id/pageNumber pairs.
- GET /media/editorial/releases/:releaseId/pages/:pageId: authenticated,
  DB-authorized 302 to a 60-second signed GET. Page/release association, READY
  asset and strict final PAGE namespace are checked. Responses and signed object
  delivery use private, no-store. No public DRAFT delivery is added.

Mutations use Session, Origin and CSRF before service policy. Unknown body fields
are rejected. Reads require Session and current editorial view authority for
the responsible group; they never become public reads.
Lists use relative API preview routes, not persisted signed URLs or raw keys.
Signed URLs are short-lived bearer capabilities after authorization; revocation
cannot recall an already issued URL before its TTL expires.

## Association, ordering and concurrency

Intent is single-use and actor-owned. Finalize downloads a bounded snapshot,
validates real bytes, then writes those same bytes create-only to
media/manga-pages/random-UUID with private cache headers.
An interactive transaction locks the intent, then the ChapterRelease row,
rechecks authority/state, creates READY Asset, consumes the intent, appends the
ChapterPage at max(pageNumber)+1 and increments release.version. All DB writes
commit together. Two distinct intents append safely; same-intent races commit once.

Reorder takes the same release lock, verifies expectedVersion and exact page set,
uses positive temporary positions above the existing maximum to avoid immediate
unique constraint collisions, then assigns dense positions 1..N and increments
version. There are no page deletions or byte deduplication semantics in V1.
Duplicate image bytes in distinct valid intents remain distinct pages.
Every append/reorder invalidates an earlier expectedVersion.
Publications must integrate this aggregate locking/version contract in 4.4D.

## Failures and storage deployment

Missing/inaccessible resource uses neutral EDITORIAL_RESOURCE_NOT_FOUND (404).
Non-DRAFT is EDITORIAL_RELEASE_NOT_DRAFT (409); inactive Chapter uses
EDITORIAL_CHAPTER_NOT_ACTIVE; stale version is EDITORIAL_RELEASE_STALE_VERSION;
wrong exact set is EDITORIAL_PAGE_ORDER_INVALID. Malformed/duplicate DTO IDs are
400. Finalize retains existing UPLOAD_* and STORAGE_UNAVAILABLE error codes.

Validation/final PUT failure creates no productive DB state. Failed association
rolls back Asset, intent, page and version. Reconciliation deletes only this
attempt's unreferenced final key after obtaining the intent lock; uncertain
outcomes retain the object for investigation. Temp cleanup failure after commit
does not undo success. No automatic orphan deletion/retention job is introduced.

The bucket must stay private and support the existing signed PUT/GET and
conditional create-only PUT contract. Declared Content-Length/signature is not
real validation: finalize performs the authoritative size/format/decode checks.
Provider CORS must allow the configured Web origin and required signed headers.
Integration uses real PostgreSQL/HTTP/Sharp with a fake object transport; storage
unit tests exercise real S3 commands with fake transport. Live provider compliance
and deployment CORS remain operational checks, not a claim of these tests.

Existing ChapterPage/Asset/EditorialUploadIntent constraints suffice.
No schema, migration, dependency or Web changes are needed.
