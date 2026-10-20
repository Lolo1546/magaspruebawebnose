# Editorial Chapters and Release Drafts (4.4B)

## Routes

All paths are below `/editorial/projects/:projectId/chapters`.

| Method | Suffix | Result |
| --- | --- | --- |
| POST | (none) | 201 `{ chapter }` |
| GET | (none) | 200 `{ items, pagination }` |
| GET | `/:chapterId` | 200 `{ chapter }` |
| POST | `/:chapterId/releases` | 201 `{ release }` |
| GET | `/:chapterId/releases` | 200 `{ items, pagination }` |
| GET | `/:chapterId/releases/:releaseId` | 200 `{ release }` |

Reads require SessionGuard and the existing DB-fresh project view scope. Missing
and inaccessible projects use the same neutral 404. Lists authorize before
pagination (page 1, pageSize 20, maximum 50). Chapters sort by sortOrder/id ASC;
releases by createdAt/id DESC. No per-item queries or page/storage relations.

POST requires SessionGuard, OriginGuard, CsrfGuard and transaction-local
EditorialAuthorizationService.prepare: ACTIVE global ADMIN, or ACTIVE/open
FOUNDER / group ADMIN / UPLOADER membership in the chosen participating group.
The project must be ACTIVE, its Manga non-ADULT, and the group VERIFIED with an
ACTIVE/open ProjectGroup. Global ADMIN does not need membership, but still needs
an operational project/group. catalog.manage, moderator and specialized-only
roles do not confer prepare authority. Actor identity comes only from CurrentAuth.

## Logical Chapter

Body: `groupId`, `kind`, optional nullable `number`, `displayLabel`, `sortOrder`,
optional nullable `title`. Unknown fields (including status/mangaId) are rejected.
groupId is authorization context, not Chapter ownership. The project supplies
mangaId; logical Chapters are shared by all projects for that Manga.

number and sortOrder use decimal strings, nonnegative, at most eight integer and
four fractional digits (Decimal(12,4)); no floating-point coercion or DB rounding.
number may be null/omitted, including specials. Display labels are trimmed and
1..200 characters; titles trimmed and at most 200 characters, empty becomes null.
Existing DB uniqueness remains manga/kind/number, manga/kind/displayLabel and
manga/sortOrder. Null numbers do not imply one special per Manga. Conflicts return
409 EDITORIAL_CHAPTER_DUPLICATE without exposing a constraint name.

New Chapters are always ACTIVE, server-owned. ACTIVE enables release preparation,
not public publication. Existing public discovery still requires a PUBLISHED
release as well. There is no Chapter status-change endpoint in this phase.

## Release Draft

Body: `publishingGroupId`, `language`, optional nullable `supersedesReleaseId`.
language is trimmed, 1..35 characters, validated as a BCP-47 language tag supported
by the runtime's Intl.getCanonicalLocales. Spelling/case is preserved; underscore
locale notation is not accepted. There is no language catalog.

Chapter must belong to the project's Manga and be ACTIVE; other Chapter states
return 409 EDITORIAL_CHAPTER_NOT_ACTIVE. projectId is required by the route and
persisted even though legacy schema rows permit null. DRAFT, version 1 and
uploadedByUserId are server-owned. Drafts without pages are valid.

version is the optimistic-concurrency version of each independent aggregate, not
an ordinal across releases. Multiple drafts with the same context/language/group
are valid, even concurrently. The existing partial unique index restricts only
PUBLISHED releases by Chapter/normalized language/responsible group. No new
uniqueness or idempotency policy is introduced.

Replacement preparation requires an existing PUBLISHED release in the same
Project, Chapter, responsible group and case-insensitive trimmed language key.
Invalid context returns 409 EDITORIAL_REPLACEMENT_INVALID without disclosing the
other resource. It creates a fresh DRAFT linked by supersedesReleaseId; it does
not mutate the published original or execute the future atomic publication swap.

Reads include existing statuses as read-only metadata, scoped to the exact
project/chapter. Explicit DTOs expose safe identifiers, status, metadata and ISO
timestamps, never raw Prisma rows, uploader profile, pages, storage keys,
memberships or audit rows. Decimal Chapter values are serialized as strings.

## Transactions and boundaries

Writes use the existing bounded Serializable retry helper so DB-fresh authority,
resource eligibility and replacement checks are in the same transaction snapshot
as creation. Chapter uniqueness is enforced by PostgreSQL, not a find-then-create
check. The helper retries P2034 and the driver's 40001 representation; exhausted
retries return a stable conflict. Unexpected errors retain platform sanitization.

No schema/migration change. No new audit enum: current editorial audit actions do
not cover Chapter/draft creation; future release publish/withdraw audits remain
out of scope. No PATCH, status transition, hard delete, PAGE upload, ordering,
preview, publication, withdrawal or Web changes. Existing PUBLISHED/WITHDRAWN
releases cannot be mutated through these routes.
