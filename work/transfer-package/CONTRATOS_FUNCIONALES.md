# MangaZone — contratos funcionales transferidos

Convención: **I** = ruta, UI y/o servicio implementado en código original; no se ejecutó en S0.5. **P** = parcial. **E** = entidad/estructura sin flujo productivo. **V** = objetivo del plan maestro, aún no implementado. Los nombres de rutas API son referencia del código NestJS, no una obligación de infraestructura para Sites. Para las restricciones exactas consultar `reference/apps/api/prisma/schema.prisma` y migraciones 001–025.

## 1. Auth — I/P

API `GET /auth/session`, `POST /auth/register`, `/login`, `/logout`, `/logout-all`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`. Registro crea cuenta pendiente de verificación; login comprueba contraseña/estado y establece sesión; logout revoca; reset usa respuesta opaca para solicitar enlace, token de un uso y revoca sesiones al completar. Cookies, hash de token, Argon2, Origin, CSRF y límites de tasa forman el contrato actual. La cola de recuperación usa PostgreSQL y worker NestJS. Web: recuperación, reset y verificación tienen UI, `/login` es placeholder y falta registro. En Sites, definir correspondencia entre autenticación gestionada por la plataforma y `User`/roles MangaZone antes de trasladar cuentas; no asumir que la identidad de Sites equivale a email/password original.

Fuentes: `reference/apps/api/src/auth/`, `reference/apps/api/src/session/`, `reference/apps/web/src/app/login/`, `reference/apps/web/src/app/forgot-password/`, `reference/docs/API_AUTHENTICATION.md`.

## 2. Usuarios y perfil — P/E

`User` contiene estado, email/username normalizados y relaciones de contenido; `Profile` contiene displayName, bio, avatar y banner. Estado de cuenta controla sesiones y acciones. Perfiles públicos actuales se alimentan de fixture; `/configuracion` solo almacena tema local. Pendiente: perfil persistente, privacidad granular, sesiones/dispositivos, cambio de contraseña, 2FA, bloqueos, seguimiento, cuenta pendiente de eliminación y período de recuperación. Las políticas de cuenta y privacidad se deben imponer en servidor, no solo mediante preferencias visuales.

Fuentes: `reference/apps/api/prisma/schema.prisma`, `reference/apps/web/src/data/public-profiles.ts`, `reference/apps/web/src/app/configuracion/`, `reference/docs/MANGAZONE_MASTER_PLAN.md`.

## 3. Manga y catálogo — I

API `GET /manga` con búsqueda, filtros, orden y paginación; `GET /manga/:slug` para ficha; slug/alias, tipo, demografía, estado, descripción, géneros, creadores y portada en el esquema. El predicado público original es `editorialStatus=PUBLIC` y `contentRating!=ADULT`. La web `/explorar` y `/manga/[slug]` consultan la API con revalidación pública de 60 s. Futuro: búsqueda de duplicados/alias, estadística y rating reales, política +18 autorizada y gestión de cache tras mutaciones.

Fuentes: `reference/apps/api/src/manga/`, `reference/apps/web/src/app/explorar/`, `reference/apps/web/src/app/manga/[slug]/`.

## 4. Chapter — I

`Chapter` pertenece a `Manga`, con tipo, número/orden, etiqueta, título y estado; evita duplicados por manga/tipo/número y por etiqueta. API pública `GET /manga/:slug/chapters` y editorial para crear/listar/detallar capítulos de un proyecto. Los capítulos inactivos no deben exponerse como legibles. Mantener navegación entre capítulos y créditos históricos.

Fuentes: `reference/apps/api/src/editorial/editorial-chapters.controller.ts`, `reference/apps/api/src/manga/manga.controller.ts`, esquema Prisma.

## 5. ChapterRelease y páginas — I

Una publicación pertenece a capítulo y puede vincularse a proyecto, grupo responsable, idioma, grupos colaboradores, créditos y publicación reemplazada. Estados DRAFT/PUBLISHED/WITHDRAWN, versión esperada y `publishedAt` gestionado por servidor. Publicar requiere páginas densas 1..N, assets READY de tipo/tamaño/dimensiones válidos y autoridad editorial vigente; retirar conserva páginas, assets y auditoría. Reemplazo de release bloquea y revalida original/reemplazo y evita dos publicaciones equivalentes activas. El enlace firmado para página publicada se concede solo tras comprobar visibilidad exacta. No migrar estas reglas como simples cambios de bandera desde cliente.

Fuentes: `reference/docs/EDITORIAL_PUBLICATION.md`, `reference/apps/api/src/editorial/editorial-release-lifecycle.service.ts`, `reference/apps/api/src/editorial/published-page-media.service.ts`.

## 6. Reader — I

API `GET /manga/:slug/chapters/:chapterKey/reader`, con selección opcional de release. Web `/manga/[slug]/capitulo/[chapter]` consulta contenido e índice, permite navegación, ancho de lectura, controles y accesibilidad. Orden inicial de página: `?page` válida, progreso guardado compatible con ese release, primera página legible. No entregar páginas de release retirado a nueva petición pública; firmas emitidas previamente pueden durar hasta su TTL. Pendiente para Sites: verificar entrega privada y límites de media en runtime real.

Fuentes: `reference/apps/web/src/app/manga/[slug]/capitulo/[chapter]/`, `reference/apps/web/src/components/reader/`, `reference/apps/api/src/manga/`.

## 7. Progreso e historial — I/P

API `PUT /me/mangas/:mangaId/progress`, `GET /me/mangas/:mangaId/progress`, `GET /me/history`, `GET /me/release-progress`. Datos aislados por User. `ReadingProgress` mantiene la última posición por manga; `ReadingReleaseProgress` por publicación; `ReadingHistoryEntry` por capítulo. Reader guarda solo con sesión/CSRF. Pendiente: limpieza del historial y opciones de privacidad completas; evitar mezclar progresos de releases incompatibles.

Fuentes: `reference/apps/api/src/reading/`, `reference/apps/web/src/data/reading.server.ts`, `reference/apps/web/src/app/historial/`.

## 8. Biblioteca — I

API `GET /me/library`, `PUT /me/library/:mangaId`, `DELETE /me/library/:mangaId`. `LibraryEntry` es única por User+Manga, con estado y favorito. La UI `/biblioteca` requiere sesión y consulta datos privados. Mantener estados de lectura y coherencia con progreso/listas; nunca devolver biblioteca de otro usuario por ID suministrado por cliente.

Fuentes: `reference/apps/api/src/library/`, `reference/apps/web/src/app/biblioteca/`.

## 9. Listas — I

API `GET/POST /me/lists`, `GET/PATCH/DELETE /me/lists/:listId`, `POST /me/lists/:listId/items`, `DELETE /me/lists/:listId/items/:mangaId`. `UserList` tiene propietario, nombre, descripción y visibilidad; `UserListItem` es único por lista+manga. UI `/listas` y `/listas/[listId]` incluye crear, detalle y gestión. Comprobar propiedad en cada operación; la visibilidad pública futura no autoriza mutación de terceros.

Fuentes: `reference/apps/api/src/lists/`, `reference/apps/web/src/app/listas/`, `reference/apps/web/src/components/lists/`.

## 10. Comentarios — I

`MangaComment` es distinto de `PostComment`. Manga: invitados leen; cuenta ACTIVE puede crear, responder un nivel, editar o retirar su comentario; `moderate.manga_comments` permite ocultar/restaurar con razón. Cuerpo texto plano de 1–5000 caracteres semánticos; spoiler explícito; REMOVED no resucita. Proyección pública HIDDEN/REMOVED sin cuerpo ni motivo privado; ownership se obtiene por lote privado. API de raíces/respuestas usa cursores acotados. Posts de comunidad tienen comentarios y solicitudes de eliminación propios. Mantener protección XSS, spoiler fuera del DOM hasta revelar y cache privado `no-store` para acciones.

Fuentes: `reference/docs/MANGA_COMMENTS.md`, `reference/apps/api/src/manga/manga-comments.controller.ts`, `reference/apps/api/src/communities/community-content-mutations.controller.ts`.

## 11. Reviews, ratings y votos — E

Existen `Review` y `ReviewVote`, con puntuación, cuerpo, spoiler, estado, unicidad User+Manga y voto único User+Review; `ContentDeletionRequest` admite `reviewId`. No hay API/UI productiva completa de reviews/votos en el snapshot. Pendiente definir creación/edición, agregados, cursor, propiedad, moderación, solicitud de eliminación y casos de carrera. No calcular ratings reales desde el componente visual ni desde fixtures. Consultar diseño antes de construir la interfaz.

Fuentes: `reference/apps/api/prisma/schema.prisma`, `reference/apps/web/src/components/manga/Rating/`, `reference/docs/MANGAZONE_MASTER_PLAN.md`.

## 12. Communities — I/P

API pública de listado, detalle y posts; solicitudes de creación, revisión, membresías, gestión de miembros/roles, publicación/comentario y moderación de contenido. Una comunidad tiene propietario, miembros y posible Manga relacionado. El rol interno de comunidad no equivale a MODERATOR global. Antes de crear se deben detectar similares; solicitud requiere revisión. Posts y comentarios preservan estados y petición de eliminación. UI pública, detalle, administración de solicitudes y panel de moderación existen en código. Futuro: funciones comunitarias extendidas y políticas antiabuso.

Fuentes: `reference/apps/api/src/communities/`, `reference/apps/web/src/app/comunidades/`, `reference/apps/web/src/app/moderacion/comunidades/`.

## 13. Scanlation Groups — I/P

Grupo con slug, nombre, idioma, estado, verificación, miembros/roles y recursos visuales. Solicitud de creación pasa por revisión; acceso editorial depende de membresía y rol de grupo vigente. Proyectos admiten grupos y colaboraciones; conservar responsables, créditos y continuidad histórica. UI pública de directorio/detalle y paneles administrativos/editoriales existen. El plan maestro también prevé continuidad de proyectos, disputas y apelación: no asumir que todos esos flujos están terminados.

Fuentes: `reference/apps/api/src/scanlation-groups/`, `reference/apps/api/src/editorial/`, `reference/apps/web/src/app/grupos/`, `reference/docs/EDITORIAL_PROJECTS.md`.

## 14. Editorial — I/P

Flujos de Manga, metadatos, portadas, proyectos, capítulos, releases, páginas, miniaturas, publicación y retiro. Mutaciones requieren sesión, Origin/CSRF y políticas centrales; `catalog.manage` cubre catálogo, mientras publicar/retirar release usa autoridad contextual de ADMIN global o roles de grupo autorizados, revalidada bajo bloqueo. Uploads usan intents/finalización, validación de imágenes y claves finales privadas. Las vistas editoriales existen en `apps/web/src/app/editorial/`. No simplificar las transacciones y auditorías durante adaptación a Sites.

Fuentes: `reference/apps/api/src/editorial/`, `reference/apps/web/src/app/editorial/`, `reference/docs/EDITORIAL_*.md`, `reference/docs/STORAGE_UPLOADS.md`.

## 15. Administración — I/P

Dashboard/directorios de usuarios, grupos y comunidades; lectura de solicitudes; mutaciones de suspensión/restauración y concesión/revocación de roles/permisos con razón y auditoría. Guard global ADMIN y estado ACTIVE se comprueban en servidor. `ADMIN` hereda permisos conocidos; `MODERATOR` aislado no. Panel visual existente no representa todavía todas las áreas del plan maestro. No permitir que niveles, reputación o grupos eleven autoridad global.

Fuentes: `reference/apps/api/src/admin/`, `reference/apps/api/src/authorization/`, `reference/apps/web/src/app/administracion/`.

## 16. Moderación — I/P/E

Implementado en código: permisos `moderate.manga_comments`, `moderate.communities`, `moderate.scanlations`, ocultar/restaurar contenido de ámbitos concretos, revisar solicitudes y conservar `ModerationAction`/auditorías. Estructura sin flujo productivo completo: reportes generales, sanciones, apelaciones y eliminación de cuenta. Objetivo: permiso por área, razón obligatoria, historial inalterable, privacidad de mensajes reportados y revisión de contenido sin acceso irrestricto a mensajes privados. Solicitudes de eliminación de contenido pasan por moderación; Review requiere todavía su propio flujo.

Fuentes: `reference/apps/api/src/authorization/`, `reference/apps/api/src/manga/manga-comments.service.ts`, `reference/apps/api/src/communities/`, `reference/apps/api/prisma/schema.prisma`, `reference/docs/SECURITY_ARCHITECTURE.md`.

## Contrato transversal de calidad

Para declarar terminada una función: UI accesible y responsive; endpoint y validación; persistencia; permisos de servidor; aislamiento entre usuarios; estado de carga/vacío/error; pruebas de ejecución y concurrencia cuando modifica datos; auditoría cuando corresponde; evidencia visual en viewports nombrados. No usar mocks permanentes para datos de producto.
