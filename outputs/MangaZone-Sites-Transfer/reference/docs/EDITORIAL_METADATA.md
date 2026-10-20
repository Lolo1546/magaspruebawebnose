# Editorial metadata contract — 4.2B.1

Migration `20260914000000_021_editorial_metadata` adds six MangaType values
and nullable Manga.demography. Existing rows retain their types and receive
null demography. No heuristic backfill or public legacy reclassification runs.
Migrations 018–020 must not be changed or repaired for this phase.

Types: MANGA, MANHUA, MANHWA, WEBTOON, NOVEL, COMIC, ONE_SHOT, DOUJINSHI, OEL.
Demographies: SEINEN, SHOUJO, SHOUNEN, JOSEI, KODOMO.
Create allows omitted/null demography; PATCH omission preserves it and null clears it.
Editorial list/detail and public catalog/detail return demography, including null.
Both catalog list APIs accept an optional exact demography filter.

Publication checks remain inside the existing Serializable transaction. Publishing
DRAFT requires a valid title, nonempty synopsis (maximum 10000), type, demography,
allowed rating, work status, at least one genre and creator contribution, plus
existing authorization, version and duplicate checks. Cover is not required.
Incomplete metadata returns HTTP 409 `EDITORIAL_MANGA_NOT_READY` with stable
`missingRequirements` keys: title, description, type, demography, contentRating,
status, genres, creators. Existing ADULT, version, transition and duplicate errors
retain their codes and precedence. Existing PUBLIC legacy rows are not unpublished.
Metadata PATCH does not introduce a second publication lifecycle.

GET /editorial/genres and GET /editorial/creators require ACTIVE and global ADMIN
or catalog.manage. Query: q (trimmed, max 80), page (default 1), pageSize (default
20, max 50). Case-insensitive name substring search; order name ASC, id ASC.
Response: items of {id,name} and pagination {page,pageSize,total,pageCount}.
No writes, biography, private metadata, or relation expansion.

Contributions remain AUTHOR=Autor, ARTIST=Artista, STORY=Historia,
ILLUSTRATION=Ilustración. Multiple contribution types per creator are preserved;
duplicate creator/type pairs are rejected. Aliases retain their API name.
Partial edits preserve CANCELLED/UNKNOWN and long descriptions. ADULT remains
stored in legacy; mutations never silently replace it with an allowed rating.

## Isolated PostgreSQL verification

From apps/api run `node test/run-editorial-isolated.cjs` for full integration,
or append Jest test paths for a focused run. It requires local development/test
URLs and permission to create a disposable database. The runner creates a unique
database ending in _test, replays all migration SQL in order, runs the standard
integration configuration, and drops only its own database in finally. It does
not write or repair any migration ledger. The existing configured test database
is not used for the run. Do not run multiple integration runners concurrently.

Two existing auth suites hardcode the database and role identity, so a full
isolated invocation reports their environment assertions as failures. For complete
coverage without changing those tests, run these commands sequentially from apps/api:

```
node test/run-editorial-isolated.cjs --testPathIgnorePatterns password-reset.int-spec password-reset-request-queue.int-spec
pnpm run test:int test/auth/password-reset.int-spec.ts test/auth/password-reset-request-queue.int-spec.ts
```

Report the isolated and configured-database results separately. The second command
uses the existing test database and its regular fixture cleanup, without deploying
or repairing migrations. It does not validate editorial schema changes.

Storage, banner, upload, media routes, projects and chapter workflows are outside
this extension. Web changes here adapt existing public consumers only.
