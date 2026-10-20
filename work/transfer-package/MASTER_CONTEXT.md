# MangaZone Sites — MASTER CONTEXT S0.5

Fecha de referencia: 20 de octubre de 2026. Este documento es autosuficiente para iniciar la construcción desde ChatGPT en la nube. El repositorio original estaba en `C:\Users\ELIAS\Desktop\MangaZone`, rama `master`, HEAD `6a6e2426c3a4c028faaab4342b2cb55973543cef` al preparar el paquete. La ruta local no se vuelve accesible automáticamente desde el navegador. El código copiado es una **referencia**, no una aplicación de Sites ya adaptada.

## 1. Visión y alcance del producto

MangaZone es una plataforma en español centrada en Manga, Manhwa y Manhua. Debe permitir descubrir obras, leer publicaciones de capítulos, continuar la lectura, administrar biblioteca y listas, participar en comunidades, publicar mediante grupos de scanlation verificados y operar un catálogo editorial con permisos y moderación. La identidad del producto incluye tema oscuro, acento rojo, navegación adaptativa y atención explícita a spoilers y privacidad.

**MangaZone Sites será una aplicación funcional completa, no una demo.** El estado parcial del repositorio original no recorta el alcance objetivo. Las funciones futuras del plan maestro —Fan-Art, Clips, Anime, seguidores, mensajes, Momentos, Cultivo, niveles, insignias, reputación, notificaciones, soporte, normas y mecanismos de seguridad de cuenta— siguen siendo objetivos del producto. Su secuencia y contratos se definirán sin simular permanencia con fixtures.

Principios: persistencia real de registros; autorización de servidor por identidad, estado, permiso y recurso; historial editorial y de moderación; contenido adulto protegido desde la entrega de datos; privacidad por defecto; diseño productivo como referencia para componentes ya aprobados; accesibilidad y responsive; arquitectura mantenible y adaptable a una evaluación posterior de hosting compartido.

## 2. Arquitectura original

Monorepo pnpm 9.12.1 (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). `apps/web`: Next.js 16.2.12, React 19.2.4, TypeScript y App Router. `apps/api`: NestJS 11, Prisma 7.9.1, PostgreSQL, módulos de auth, sesión, autorización, catálogo, lectura, biblioteca, listas, grupos, comunidades, editorial y administración. `packages/types` y `packages/config` son mínimos. `apps/api/prisma/schema.prisma` define entidades y `migrations/` contiene 001–025.

La web combina `app/` para rutas, `components/` para UI, `data/` para clientes/servidor/fixtures, `styles/tokens.css` para identidad y CSS Modules para pantallas. La API combina controladores, DTO, servicios, guards y Prisma. Archivos editoriales se almacenan mediante interfaz de objetos S3 compatible; correo mediante Resend; recuperación de contraseña mediante cola PostgreSQL y worker NestJS; rate limiting actual en memoria de proceso. `infrastructure/` todavía no ofrece Docker ni despliegue completo.

## 3. Estado real de implementación

La categoría **flujo en código** significa que hay componentes/rutas y servicios o endpoints correspondientes; S0/S0.5 no levantaron servicios ni probaron producción. No afirmar operatividad de ejecución sin una prueba específica.

| Área | Estado original | Alcance o brecha |
| --- | --- | --- |
| Home | Fixture | Hero, actualizaciones, continuar leyendo, ranking, comunidad y noticias usan datos de desarrollo. |
| Catálogo, búsqueda y filtros | Flujo en código | `/explorar` consulta `GET /manga`, con filtros y paginación. |
| Ficha y capítulos | Flujo en código | `/manga/[slug]` consulta detalle e índice; alternativas derivan de publicaciones. |
| Reader y progreso | Flujo en código | Publicaciones/páginas reales y guardado por publicación para usuario autenticado. |
| Ranking y perfiles públicos | Fixture | Seeds y perfiles locales; aún no son consultas de producto. |
| Registro/login | Parcial | API existente; `/login` web es placeholder y falta interfaz de registro. |
| Verificación y recuperación | Flujo en código | Páginas y endpoints; entrega de correo/worker sin prueba en S0.5. |
| Biblioteca, favoritos, listas e historial | Flujo en código | API y vistas; limpieza de historial anunciada pero pendiente. |
| Comentarios de manga | Flujo en código | Crear, responder, editar, retirar y moderar con spoilers. |
| Reviews/ratings/votos | Modelo solamente | `Review`/`ReviewVote` existen; no hay flujo productivo completo. |
| Comunidades | Flujo en código | Directorio, detalle, solicitudes, membresía, posts, comentarios y moderación. |
| Grupos de scanlation | Flujo en código | Directorio, solicitudes, miembros/roles y participación editorial. |
| Editorial | Flujo en código | Manga, proyectos, capítulos, releases, páginas, portadas, miniaturas y publicación/retiro. |
| Administración | Flujo en código | Dashboard, usuarios, grupos, comunidades, solicitudes y gestión de rol/permiso. |
| Reportes, sanciones, apelaciones | Modelo solamente | Requieren contratos y flujo de usuario/moderación. |
| Notificaciones y mensajería | Modelo y placeholder | No hay producto completo. |
| Fan-Art, Clips, Anime, noticias | Placeholder/visión | No equivalen a módulos persistentes. |
| Seguidores, Momentos, Cultivo, gamificación | Visión | Pendientes de diseño funcional, datos, UI y protección contra abuso. |

## 4. Navegación y rutas originales

Públicas: `/` Home; `/explorar`; `/manga/[slug]`; `/manga/[slug]/capitulo/[chapter]`; `/ranking`; `/grupos` y `/grupos/[slug]`; `/comunidades` y `/comunidades/[slug]`; `/perfil/[username]`. `/tendencias`, `/noticias`, `/fanart`, `/clips`, `/anime` son placeholders. `/comunidad` y `/mi-lista` redirigen.

Cuenta/usuario: `/login` placeholder; `/verify-email`, `/forgot-password`, `/reset-password`; `/biblioteca`, `/listas`, `/listas/[listId]`, `/historial`; `/configuracion` solo tema local. `/perfil`, `/notificaciones` y `/mensajes` son placeholders.

Operación: `/moderacion/comunidades`; `/administracion`, `/administracion/usuarios`, `/administracion/grupos`, `/administracion/comunidades`, `/administracion/solicitudes`; `/editorial/mangas`, `/editorial/mangas/nuevo`, `/editorial/mangas/[id]`, `/editorial/proyectos`, `/editorial/proyectos/[projectId]`, `/editorial/proyectos/[projectId]/capitulos/[chapterId]/publicaciones/[releaseId]`.

Las rutas son referencia de navegación, no prueba de que todas las funciones estén terminadas. En Sites se deben conservar enlaces semánticos y definir redirecciones controladas al cambiar rutas.

## 5. Modelo de datos y relaciones

El esquema real contiene `User`, `Profile`, `Asset`, `Manga`, `MangaAlias`, `Genre`, `Creator`, `Chapter`, `ChapterRelease`, `ChapterPage`, `LibraryEntry`, `ReadingProgress`, `ReadingReleaseProgress`, `ReadingHistoryEntry`, `UserList`, `UserListItem`, `MangaComment`, `Review`, `ReviewVote`, `ScanlationGroup`, `ScanlationGroupMember`, `ScanlationProject`, `ProjectGroup`, `ProjectRequest`, `Community`, `CommunityMember`, `Post`, `PostComment`, `Report`, `ModerationAction`, `UserSanction`, `Appeal`, `ContentDeletionRequest`, `Notification`, `Conversation`, `Message`, `Session`, tokens de verificación/reset, `Role`, `Permission`, `UserRole`, `RolePermission` y `UserPermissionGrant`, entre otros.

Relaciones centrales: User→sesiones/perfil/biblioteca/listas/progreso/roles/permisos; Manga→alias/géneros/creadores/capítulos/comentarios/reviews/proyectos; Chapter→releases; ChapterRelease→páginas/assets/grupos/créditos/reemplazo; Community→miembros/posts/comentarios; ScanlationGroup→miembros/proyectos/releases. `ReadingProgress` es único por usuario+manga, `ReadingReleaseProgress` por usuario+release, `ReadingHistoryEntry` por usuario+capítulo, `LibraryEntry` por usuario+manga, `UserListItem` por lista+manga, `Review` por usuario+manga y `ReviewVote` por usuario+review. El esquema y las migraciones son la fuente de restricciones exactas.

## 6. Reglas de negocio críticas

- Catálogo público actual: manga `PUBLIC` y no `ADULT`; las publicaciones públicas requieren capítulo activo, release publicado y páginas autorizadas. El objetivo +18 futuro exige sesión/habilitación explícita y protección de recursos, no solo blur visual.
- Una obra tiene ficha única y alias; antes de crearla debe buscarse coincidencia. Grupos verificados y comunidades nacen de solicitudes revisadas. Roles de grupo y comunidad no equivalen a permisos globales.
- Proyecto de grupo puede incluir colaboración, continuación e historial; los créditos históricos no se eliminan al cambiar grupo. La publicación editorial comprueba autoridad, versión, páginas 1..N, assets listos, provenance y estado. Reemplazo/retiro conservan historial y auditoría.
- Progreso de lectura y biblioteca son privados por defecto. El reader retoma página explícita válida, después progreso compatible, después primera página disponible.
- Comentarios de manga son texto plano; replies de un nivel; spoilers ocultos hasta revelar; autor puede retirar definitivamente su comentario; moderador autorizado puede ocultar/restaurar con razón y auditoría. Reviews y votos todavía no tienen contrato productivo cerrado.
- Eliminación de publicaciones por usuario se plantea como solicitud a moderación; la eliminación de cuenta y recuperación de siete días son visión del plan maestro, no flujo actual terminado.
- Cultivo mide interacción bilateral diaria y no concede permisos ni XP automáticamente. Nivel, insignias, reputación y autoridad son sistemas distintos.

## 7. Autenticación, autorización y privacidad

Actual: cookie de sesión, hash de token, Argon2 para contraseña, estados de cuenta, verificación de correo, reset, Origin/CSRF en mutaciones, DTO con whitelist, permisos globales y controles por recurso. `ADMIN` resuelve permisos conocidos; `MODERATOR` sin concesión específica no es autoridad universal. Permisos conocidos: `catalog.manage`, `moderate.manga_comments`, `moderate.communities`, `moderate.scanlations`. La memoria de proceso limita el rate limiting en múltiples réplicas.

Objetivo Sites: asociar identidad autenticada de la plataforma a un User de MangaZone, sin asumir equivalencia de cuentas ni conceder permisos por iniciar sesión. Todo endpoint privado debe verificar identidad, estado, permiso y pertenencia en servidor. Separar cache público y privado; no devolver cuerpos ocultos ni originales +18 a clientes sin autorización; registrar mutaciones editoriales y moderación. Cumplir privacidad por defecto, validación y protección de uploads; no incluir secretos en código o paquete.

## 8. Sistema visual aprobado y decisiones pendientes

La UI productiva existente manda para componentes ya aprobados. `apps/web/src/styles/tokens.css` define base oscura `#080809`, rojo `#e8192c`, tipografía Inter y display Bebas Neue, escalas de espacio, radio, sombras, tema claro y AMOLED. `app/layout.tsx`, AppShell/Header/Sidebar/MobileBottomNav y componentes UI/feedback/manga/reader proporcionan la base. CSS Modules contienen responsive; hay marcadores ARIA, focus y movimiento reducido en componentes inspeccionados. No se hizo QA visual renderizada en S0.5.

Los 23 HTML de `designs/` son referencia de intención para pantallas pendientes; no reemplazan las versiones productivas. Dos fichas y dos lectores reflejan variantes. `phase-3a/03-lector1.html` usa la identidad «Sumi Reader»: **DESIGN DECISION REQUIRED** antes de incorporarla. También requiere decisión el diseño definitivo de login/registro, reviews, reportes, notificaciones y funciones sociales aún no productivas. Los cinco SVG de `public/demo/` son placeholders abstractos locales; no son portadas de catálogo definitivas. Las fuentes se referencian por nombre/configuración y no se redistribuyen archivos de fuente.

## 9. Arquitectura inicial para Sites

Separar UI React/rutas, servicios de aplicación, dominio y políticas, autorización, persistencia, almacenamiento de medios y operaciones de servidor. Las guías locales de Sites documentan Workers, D1, R2 y autenticación gestionada; **no se ha creado ni probado un Site MangaZone**. Validar identidad, audiencia pública/privada, transacciones/concurrencia, migraciones, tratamiento de imágenes, enlaces privados y trabajos durables antes de elegir equivalentes definitivos a PostgreSQL/Prisma/NestJS/S3/worker. Mantener límites de dominio para evaluar después hosting compartido sin restringir las funciones actuales.

## 10. Roadmap funcional completo

| Fase | Objetivo | Criterio de avance |
| --- | --- | --- |
| S1 | Ensayo real de identidad, persistencia, archivos, servidor y límites de Sites | Dos usuarios aislados, datos y archivo privados persistentes, y decisiones documentadas sobre capacidades. |
| S2 | Núcleo User, permisos, catálogo y contratos de error | Catálogo persistente, filtros +18, restricciones y autorización probados. |
| S3 | Ficha, capítulos, releases, reader y progreso | Publicación/retirada visibles correctamente, recursos privados y reanudación entre sesiones. |
| S4 | Biblioteca, favoritos, listas, historial, cuenta y privacidad | CRUD real, aislamiento y opciones persistentes; sin placeholders de cuenta. |
| S5 | Comunidades, grupos, publicaciones, comentarios y solicitudes | Moderación, propiedad, membresía y auditoría probadas en concurrencia. |
| S6 | Editorial y administración completas | Versiones, reemplazos, uploads, permisos y auditoría atómica probados. |
| S7 | Reviews/ratings/votos, reportes, sanciones, apelaciones y solicitudes de eliminación | Cada módulo con UI, API, persistencia, permisos y tests de flujo completo. |
| S8 | Notificaciones, mensajes, Fan-Art y seguridad ampliada | Privacidad, entrega, moderación y antispam validados por función. |
| S9 | Clips, Anime, seguidores, Momentos, Cultivo, gamificación, soporte y normas | Políticas y datos reales; no sustituir con fixtures permanentes. |
| S10 | Endurecimiento, accesibilidad, rendimiento, observabilidad, backups y publicación | QA real por viewport/rol, seguridad, recuperación y operaciones de producción. |

Las fases son orden recomendado, no autorización para crear el Site en S0.5. Cada fase requiere pruebas funcionales, regresión de permisos, privacidad y aceptación visual antes de avanzar.

## 11. Calidad y seguridad de entrega

No declarar operativa una función por existir un modelo, una ruta o una prueba aislada. Probar flujo real, datos persistidos, estados de error, dos identidades, anonimato, roles, ownership, carreras y expiración de sesión. Validar responsive y teclado con viewports nombrados; contrastar pantallas productivas con la fuente visual canónica. Evitar N+1 y paginar listas. No exponer secretos, tokens, correo o datos privados en cliente, logs, cachés o archivos transferidos. Mantener migraciones controladas y reversibilidad de decisiones; nunca reescribir historia editorial o de moderación.

## 12. Referencias dentro de este paquete

`reference/README.md`; `reference/docs/MANGAZONE_MASTER_PLAN.md`; `reference/docs/SECURITY_ARCHITECTURE.md`; `reference/docs/TECHNICAL_ARCHITECTURE.md`; `reference/docs/EDITORIAL_PUBLICATION.md`; `reference/docs/MANGA_COMMENTS.md`; `reference/docs/STORAGE_UPLOADS.md`; `reference/apps/api/prisma/schema.prisma`; `reference/apps/api/prisma/migrations/`; `reference/apps/api/src/app.module.ts`; `reference/apps/api/src/authorization/global-authorization.service.ts`; `reference/apps/api/src/manga/utils/public-manga.utils.ts`; `reference/apps/web/src/app/page.tsx`; `reference/apps/web/src/app/manga/[slug]/page.tsx`; `reference/apps/web/src/app/manga/[slug]/capitulo/[chapter]/page.tsx`; `reference/apps/web/src/styles/tokens.css`; `reference/designs/`. Los archivos originales se conservan con rutas relativas y hashes en `MANIFEST.csv`.
