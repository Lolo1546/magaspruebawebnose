# Release publication and withdrawal (4.4D)

## Commands and authority

`POST /editorial/projects/:projectId/chapters/:chapterId/releases/:releaseId/publish`
and the equivalent `/withdraw` command accept only `{ expectedVersion }` and
return HTTP 200 with the existing safe `{ release }` DTO. Session, Origin and
CSRF guards apply. State, timestamps, actor and responsibility are server-owned.

The central editorial policy grants publication/withdrawal to ACTIVE global
ADMIN, FOUNDER and group ADMIN. UPLOADER preparation authority, specialized roles,
catalog.manage and global MODERATOR are insufficient. Authorization and resource
context are checked again after acquiring release locks. Existing global ADMIN
withdrawal policy is retained; no new RBAC bypass is introduced.

## Readiness and immutable history

Publication requires a DRAFT, current version, valid project/responsible group,
ACTIVE chapter, non-ADULT manga, valid language, and at least one page. Pages must
be dense 1..N with distinct READY assets, final PAGE keys, valid PAGE MIME/size/
pixel metadata and FINALIZED MANGA_PAGE intents belonging to that release.
This consumes the validation established by finalize; publication does not move,
decode, copy or delete storage objects.

DRAFT becomes PUBLISHED with server `publishedAt` and version +1. PUBLISHED
becomes WITHDRAWN with version +1, preserving its publication time, pages, assets
and lineage. There is no withdrawnAt column, revive operation, hard deletion or
GC. PAGE intent/finalize/append/reorder require DRAFT and remain forbidden after
publication or withdrawal. WITHDRAWN stays readable by authorized editorial users.

## Replacement and concurrency

A replacement must target a still-PUBLISHED original with identical project,
chapter, responsible group and case-insensitive trimmed language. One interactive
READ COMMITTED transaction locks original and replacement in UUID order,
revalidates authority/context/readiness/version, withdraws the original and
publishes its replacement. Both events use the same server timestamp. Original
publishedAt is preserved; replacement publishedAt determines new recency.

Each successful transition writes exactly one EditorialAuditEvent in that same
transaction. Release events carry actor, releaseId, fromVersion, toVersion and
createdAt; project/manga context is available through the referenced release.
Other resource references are null. A swap writes exactly two events. Any failure
rolls back both state and audit. Failed/stale attempts create no audit.

The existing partial unique index prevents two equivalent PUBLISHED releases
(chapter + normalized language + responsible group), including across projects.
Same-release commands and PAGE append/reorder serialize on the release row.
Expected versions are never silently retried. Concurrent replacement losers stay
DRAFT and receive 409; unique publication conflicts also return stable 409.

## Public delivery

Public reads require PUBLIC non-ADULT manga, ACTIVE chapter and PUBLISHED release.
Production PAGE URLs use the existing configured MEDIA_API_ORIGIN plus
`/media/releases/:releaseId/pages/:pageId`. That endpoint checks the exact pair,
publication state, READY asset, finalized provenance and strict final key before
returning a short-lived signed GET redirect. It emits private/no-store,
no-referrer and nosniff headers; the bucket remains private. No unsigned fallback
is used for production PAGE keys. Legacy/demo reader assets retain their current
handling.

Withdrawn and replaced originals stop receiving new signed links immediately.
Already issued links can remain usable until the existing 60-second storage TTL
expires; withdrawal does not revoke object-store signatures already issued.
Deployments must configure MEDIA_API_ORIGIN and private storage credentials/CORS
as documented in STORAGE_UPLOADS.md. Provider behavior is not claimed as tested
by fake-transport integration tests.

## Migration and verification

Migration `20260924000000_022_release_publication_audit` only adds two enum values,
the nullable release reference/FK/index and updates the exclusive audit resource
shape. It does not rewrite data, add withdrawnAt or change historical migrations.
Apply it before deploying the generated Prisma client/API. Test replay uses a
new disposable local database, not production or a repaired migration ledger.

PostgreSQL/HTTP tests cover readiness, authority, immutable PAGE operations,
public reader/media visibility, swaps, audit rollback, constraints and coordinated
publish/withdraw/replacement/PAGE races. Storage transport is fake; transactions,
locks, constraints and production controller/service paths are real. The known
COVER diagnostic names/wording remain deferred, unchanged in this phase.
