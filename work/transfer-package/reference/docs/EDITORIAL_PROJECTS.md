# Editorial projects V1 (4.4A)

`ScanlationProject` is the explicit Manga/group relationship through `ProjectGroup`;
it does not confer ownership. Multiple projects for the same manga, including the
same participating group, are valid. Repeating provisioning creates another project:
there is no manga-level uniqueness, implicit open-project category or idempotency.
The existing partial unique index still permits only one open participation per
`(projectId, groupId)`, with separate historical participation periods.

## Administration

The existing `POST /editorial/projects` accepts `mangaId` and `initialGroupId`.
Only an ACTIVE global ADMIN can provision or add/remove group participation.
The group must currently be VERIFIED; the manga must exist and not be ADULT.
DRAFT mangas are eligible; provisioning does not change manga publication status.
Creation, initial participation and `EditorialAuditEvent.PROJECT_CREATED` share
one transaction. Existing participation commands and last-operational-group rules
remain in place. No lifecycle-transition or hard-delete endpoint is added.

## Reads

`GET /editorial/projects` uses page=1, pageSize=20 (maximum 50), with
`createdAt DESC, id DESC`. It returns `{ items, pagination }`, including total and
pageCount (minimum 1). `GET /editorial/projects/:id` returns `{ project }`.
Both require a session and an ACTIVE actor resolved from the database.

Global ADMIN has administrative visibility across existing lifecycle states,
including retained legacy records. Other users see only ACTIVE, non-ADULT projects
through an ACTIVE/open project participation in a VERIFIED group and their own
ACTIVE/open membership with FOUNDER, ADMIN or UPLOADER. Membership roles are read
from the database, not the session. No-access lists are empty; inaccessible and
missing detail IDs produce the same `EDITORIAL_PROJECT_NOT_FOUND` 404.

The explicit read DTO contains project id/status/timestamps, a minimal manga
summary and currently ACTIVE/open participating group summaries. It contains no
actor, creator attribution, membership/role rows, audit events or private user data.
The service uses one scope lookup, count + one paginated Prisma findMany (or one
scoped detail query); nested group projection does not create application N+1.
No assertion is made about a single SQL statement for Prisma relation loading.

## Operational policy for later releases

`EditorialAuthorizationService.assertPublishing` accepts a transaction client.
Mutation callers must pass their transaction and revalidate at the write boundary.
`view`, `prepare` (including reorder/preview) and `upload` permit FOUNDER, group ADMIN
and UPLOADER; `publish`/`withdraw` permit only FOUNDER and group ADMIN. Roles combine
by union. Specialized roles alone, `catalog.manage`, MODERATOR and `moderate.*`
grant no operational project authority. ACTIVE global ADMIN is the override.

The existing resource requirements remain: ACTIVE project, non-ADULT manga,
VERIFIED group and ACTIVE/open participation. The existing global ADMIN withdrawal
recovery exception is preserved; administrative read access is not permission to
prepare or publish an otherwise ineligible project.

A project is mandatory for a future productive release. This slice adds no chapter,
release, page-upload, publish/withdraw implementation or Web UI. Existing project
states are retained without introducing new states or transitions.
