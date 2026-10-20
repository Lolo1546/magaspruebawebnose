# MangaZone — Arquitectura Técnica Oficial

Este documento define la arquitectura técnica oficial aprobada para convertir MangaZone en una aplicación web real, escalable, segura y desplegable posteriormente en hosting.

Su contenido establece decisiones arquitectónicas, pero no constituye una implementación. No autoriza por sí solo la creación de código, infraestructura, base de datos, migraciones, secretos ni recursos de producción.

Documentos obligatorios relacionados:

- [Plan maestro](./MANGAZONE_MASTER_PLAN.md): fuente funcional principal.
- [Arquitectura de seguridad](./SECURITY_ARCHITECTURE.md): fuente obligatoria para decisiones de seguridad.
- [Esquema de base de datos](./DATABASE_SCHEMA.md): modelo conceptual oficial de base de datos.
- [API de autenticación](./API_AUTHENTICATION.md): diseño técnico de los endpoints de autenticación y flujos.
- [Entorno y pruebas](./TESTING_AND_ENV.md): entorno de pruebas y estrategia de tests de integración de base de datos.
- `mangazone_v3_responsive.html`: referencia visual y de experiencia de usuario, no arquitectura técnica definitiva.

## 1. Visión general

La arquitectura oficial separa presentación, reglas de negocio, persistencia y archivos.

Flujo principal:

```text
Usuario
  ↓
Frontend — Next.js + TypeScript
  ↓
Backend/API — NestJS + Node.js + TypeScript
  ↓
Base de datos — PostgreSQL
```

Flujo de archivos:

```text
Backend/API
  ↓
Object Storage compatible con S3
```

Evolución futura para funcionalidades en tiempo real:

```text
Frontend
  ↕
Backend WebSocket
```

El frontend presenta información y recoge acciones. El backend aplica reglas, valida identidad y permisos, coordina procesos y accede a la persistencia. PostgreSQL conserva datos relacionales. El Object Storage conserva archivos. WebSockets se incorporarán posteriormente cuando exista una necesidad real de tiempo real.

### Producción conceptual aprobada

```text
Internet
   ↓
Cloudflare — CDN, WAF y protección DDoS
   ↓
Reverse Proxy — Nginx o equivalente
   ↓
┌─────────────────────────────┐
│                             │
▼                             ▼
Next.js                     NestJS
Frontend                     API
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   PostgreSQL administrado  Object Storage     Email
```

Evolución posterior:

```text
NestJS
  ↓
Redis
Workers
Colas
WebSockets
```

Cloudflare constituye la protección perimetral futura aprobada. El reverse proxy de producción será Nginx o un equivalente compatible. La base de datos de producción será preferiblemente PostgreSQL administrado. El servidor de aplicación inicial será un VPS o una plataforma compatible con Node.js y Docker. Los proveedores concretos continúan pendientes.

## 2. Frontend

### Decisión aprobada

- Next.js.
- TypeScript.

### Responsabilidades

- Interfaz.
- Navegación.
- Renderizado.
- Componentes.
- Responsive.
- Accesibilidad.
- Comunicación con la API.
- Estado de interfaz.

El frontend podrá reflejar el estado de permisos para mejorar la experiencia, pero no será la autoridad de seguridad.

El frontend no debe decidir:

- Permisos reales.
- Acceso +18.
- Roles.
- Sanciones.
- XP.
- Cultivo.
- Propiedad de recursos.
- Autorización.

Estas decisiones corresponden al backend y deben validarse en cada operación relevante.

## 3. Backend

### Decisión aprobada

- Node.js.
- NestJS.
- TypeScript.

### Responsabilidades

- Autenticación.
- Autorización.
- Usuarios.
- Perfiles.
- Manga, Manhwa y Manhua.
- Capítulos.
- Biblioteca.
- Historial de lectura.
- Grupos verificados.
- Comunidades.
- Fan-Art.
- Mensajes.
- Notificaciones.
- Moderación.
- Contenido +18.
- Uploads.
- Seguridad.
- API.

El backend debe organizarse por módulos funcionales con límites claros. No debe convertirse en un único archivo gigante ni concentrar todas las reglas en un solo servicio.

NestJS será un **monolito modular**. La separación modular permitirá evolucionar las áreas del producto sin convertirlas en servidores independientes.

Módulos futuros previstos, sin limitar otras áreas aprobadas:

- `auth`.
- `users`.
- `profiles`.
- `manga`.
- `chapters`.
- `library`.
- `groups`.
- `communities`.
- `fanart`.
- `messages`.
- `notifications`.
- `moderation`.
- `uploads`.

No se creará una arquitectura de microservicios ni se dividirá cada módulo en un servidor independiente. La arquitectura inicial será:

```text
frontend independiente
+
backend NestJS modular monolítico
```

## 4. Base de datos

### Decisión aprobada

PostgreSQL.

PostgreSQL resulta apropiada porque MangaZone contiene numerosas relaciones y reglas de integridad entre:

- Usuarios y perfiles.
- Mangas y capítulos.
- Obras, autores, géneros y aliases.
- Grupos, miembros, proyectos y créditos.
- Comunidades, roles internos y miembros.
- Roles, permisos y asignaciones.
- Conversaciones, participantes y mensajes.
- Bibliotecas, listas e historial de lectura.
- Usuarios, seguidores y bloqueos.
- Reportes, sanciones, apelaciones y acciones de moderación.

Una base de datos relacional permite representar estas asociaciones, aplicar restricciones y ejecutar consultas consistentes.

PostgreSQL será inicialmente una única base de datos principal. No se creará una base diferente para cada módulo. La separación será lógica mediante modelos, relaciones y límites funcionales.

No se diseña todavía el esquema definitivo. Las entidades funcionales citadas en el Plan Maestro son una referencia, no tablas aprobadas.

## 5. Prisma

Prisma es la decisión aprobada para ORM y migraciones.

Se utilizaría para:

- Definir modelos.
- Representar relaciones.
- Gestionar migraciones.
- Ejecutar consultas.
- Proporcionar acceso tipado desde TypeScript.

Prisma no sustituye el diseño de datos, las restricciones de negocio ni la autorización. Su uso futuro deberá respetar integridad, transacciones, índices y mínimo privilegio de base de datos.

### Estado de integración local

Prisma está integrado en `apps/api` como infraestructura inicial del backend:

- Configuración CLI en `apps/api/prisma.config.ts`.
- Schema mínimo en `apps/api/prisma/schema.prisma`.
- Cliente generado en `apps/api/generated/prisma`.
- PostgreSQL local de desarrollo mediante `DATABASE_URL` privada en `apps/api/.env`.

Esta integración no contiene modelos funcionales del producto, migraciones ni inyección de Prisma en NestJS. El diseño y las migraciones futuras deberán seguir `docs/DATABASE_SCHEMA.md` y requerir autorización por fase.

## 6. Archivos

Los archivos grandes no deben almacenarse directamente en PostgreSQL como estrategia principal.

Separación aprobada:

| Componente | Responsabilidad |
|---|---|
| PostgreSQL | Metadata, relaciones, propiedad, estado, referencias y políticas de acceso |
| Object Storage compatible con S3 | Binarios y archivos procesados |

Ejemplos de archivos:

- Avatares.
- Banners.
- Portadas.
- Fan-Art.
- Imágenes.
- GIF.
- Páginas autorizadas.
- Videos futuros.

La base de datos guardará referencias y metadatos; no necesariamente los binarios.

Todo flujo de archivos deberá cumplir `docs/SECURITY_ARCHITECTURE.md`, incluida validación, procesamiento, cuarentena cuando corresponda y protección contra ejecución.

## 7. CDN

La arquitectura utilizará Cloudflare en producción como capa perimetral futura, incluyendo CDN, WAF y protección DDoS cuando corresponda.

Flujo conceptual:

```text
Usuario
  ↓
CDN
  ↓
Object Storage
```

La CDN podrá reducir latencia, descargar tráfico del origen y mejorar la entrega de imágenes y otros recursos. No sustituye la autorización del backend ni convierte un recurso restringido en público.

Cloudflare queda aprobado como tecnología perimetral. El plan o configuración concretos continúan pendientes.

## 8. Contenido privado y +18

Los recursos restringidos no deben hacerse públicos mediante una URL permanente accesible sin autorización.

La arquitectura debe soportar:

- Autorización en backend.
- Recursos protegidos.
- URLs temporales o firmadas cuando corresponda.
- Placeholders para usuarios no autorizados.

Flujo conceptual:

```text
Usuario solicita recurso
  ↓
Backend verifica identidad, configuración y permiso
  ↓
Entrega autorizada o placeholder/denegación
```

Ocultar un recurso con CSS no constituye control de acceso. Un usuario no autorizado no debe recibir el original explícito.

No se implementará todavía el mecanismo concreto.

## 9. Redis

Redis no será obligatorio en la primera versión.

La arquitectura debe quedar preparada para incorporarlo posteriormente en:

- Caché.
- Rate limiting distribuido.
- Sesiones, si la arquitectura definitiva lo requiere.
- Presencia.
- Coordinación de WebSockets.
- Colas.
- Notificaciones.
- Procesos temporales.

Redis debe añadirse posteriormente por una necesidad comprobada, no como complejidad inicial automática.

No se instalará ni configurará todavía.

## 10. Mensajería

Los mensajes privados básicos podrán persistir inicialmente mediante la API y PostgreSQL.

Flujo inicial:

```text
Frontend
  ↕ API HTTP
Backend
  ↕
PostgreSQL
```

El tiempo real será una evolución posterior mediante WebSockets. La autorización seguirá aplicándose por conversación y por operación, incluso cuando exista una conexión persistente.

No se implementará chat todavía.

## 11. Cultivo

Cultivo será calculado o validado por el backend a partir de interacción válida de ambos usuarios durante el día correspondiente.

El frontend podrá mostrar el resultado, pero no enviar un contador que se acepte como autoridad.

Cultivo seguirá siendo independiente de XP, nivel, reputación y permisos, conforme al Plan Maestro.

No se implementará todavía.

## 12. Notificaciones

Flujo conceptual:

```text
Evento
  ↓
Backend
  ↓
Notificación
  ↓
Usuario
```

Un evento legítimo del sistema podrá producir una notificación respetando preferencias, permisos y privacidad del destinatario.

La arquitectura debe poder evolucionar hacia tareas asíncronas para evitar que operaciones secundarias alarguen la petición principal.

No se implementará todavía.

## 13. Procesos asíncronos

Las tareas costosas, diferibles o sujetas a reintentos no deberían ejecutarse íntegramente dentro de la petición HTTP principal.

Ejemplos futuros y actuales:

- **Emails (Autenticación - Implementado):** El restablecimiento de contraseña utiliza una cola durable basada en PostgreSQL (`PasswordResetRequestJob`) y un worker NestJS interno. El endpoint HTTP `POST /auth/forgot-password` está desacoplado del delivery; inserta el job y retorna `HTTP 200 accepted` inmediatamente. El worker realiza polling (claim mediante `FOR UPDATE SKIP LOCKED` y lease con fencing), evalúa la elegibilidad, genera el `PasswordResetToken` y realiza el email delivery (at-least-once, dependiendo de la idempotency key del provider).
- Procesamiento de imágenes.
- Notificaciones.
- Limpieza.
- Análisis de uploads.
- Procesamiento de videos.
- Eliminación diferida de cuentas.
- Tareas programadas.

Flujo conceptual:

```text
Backend registra trabajo
  ↓
Cola (ej. PostgreSQL para Auth, Redis futuro para otros)
  ↓
Worker procesa
  ↓
Resultado y registro
```

Posteriormente podrán utilizarse otros tipos de workers o Redis para tareas distintas. El procesamiento de videos pertenecerá a esta evolución posterior. No se elige todavía producto, topología ni configuración definitiva para colas externas, manteniéndose PostgreSQL para flujos críticos como autenticación.

## 14. Eliminación de cuenta

El período funcional definido es de siete días.

La arquitectura deberá permitir:

```text
Solicitud
  ↓
Estado pendiente
  ↓
Fecha límite
  ↓
Cancelación o procesamiento definitivo
```

La solicitud, cancelación y eliminación final deben ejecutarse del lado del servidor. El proceso definitivo deberá poder tratar anonimización, responsabilidades pendientes y conservación auditada según el Plan Maestro y la Arquitectura de Seguridad.

## 15. Roles y permisos

La arquitectura debe prepararse para RBAC y permisos granulares.

No debe limitarse únicamente a:

- `user`.
- `moderator`.
- `admin`.

Un Moderador tendrá permisos asignados por área, por ejemplo:

- `moderate.communities`.
- `moderate.fanart`.
- `moderate.scanlations`.
- `moderate.adult`.
- `moderate.users`.

El Administrador posee todos los permisos y es quien puede asignar, modificar o revocar permisos de moderación.

Los permisos deben comprobarse en backend. Nivel, XP, insignias y reputación no otorgan autoridad.

No se implementará todavía el modelo definitivo.

## 16. Grupos verificados

Un Grupo verificado por MangaZone debe ser una entidad propia relacionada con usuarios.

Relaciones conceptuales:

```text
Usuario ← pertenencia → Grupo verificado
Grupo verificado → muchos miembros
Miembro → rol interno y permisos internos
```

Esto permite representar fundador, administrador, uploader, traductor, cleaner, redrawer, typesetter y proofreader, así como proyectos y colaboraciones.

No debe modelarse simplemente como:

```text
user.role = "scanlation"
```

La pertenencia a un grupo y el rol global de plataforma son conceptos distintos.

## 17. Comunidades

Las comunidades serán entidades independientes.

Deben poder relacionarse con:

- Propietarios.
- Administradores.
- Moderadores internos.
- Miembros.
- Obras relacionadas.

Los roles internos regulan la gestión dentro de la comunidad. No equivalen a permisos globales de MangaZone ni conceden autoridad sobre otras áreas.

La arquitectura debe mantener separadas la pertenencia, los roles internos de comunidad y los permisos globales de Moderadores de MangaZone.

## 18. Monorepo y gestor de paquetes

El proyecto real utilizará un monorepo con la siguiente estructura aprobada:

```text
MangaZone/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│
├── docs/
│
├── prototype/
│
└── infrastructure/
```

### Responsabilidades

- `apps/web/`: aplicación Next.js.
- `apps/api/`: aplicación NestJS.
- `packages/`: código compartido que tenga una justificación clara.
- `docs/`: documentación obligatoria.
- `prototype/`: referencias visuales y prototipos preservados.
- `infrastructure/`: configuración futura de despliegue e infraestructura.

### Gestor de paquetes aprobado

El gestor de paquetes oficial será **pnpm**.

Motivos:

- Buen soporte para monorepos.
- Ahorro de espacio.
- Workspaces.
- Instalación rápida.
- Gestión clara de dependencias.

No se utilizarán npm y Yarn simultáneamente. Debe existir un único lockfile de pnpm.

### Ventajas del monorepo

- Frontend y backend permanecen separados, pero coordinados en un repositorio.
- Facilita compartir configuración y tipos cuando sea apropiado.
- Centraliza documentación y revisión de cambios.
- Simplifica mantener versiones compatibles de las aplicaciones.
- Permite ejecutar validaciones conjuntas en CI/CD futuro.

### Consideraciones y desventajas

- Requiere disciplina para impedir dependencias incorrectas entre aplicaciones.
- Puede necesitar herramientas de workspace y configuración adicional.
- Los procesos de build y despliegue deben distinguir claramente cada aplicación.
- Compartir demasiado código puede acoplar frontend y backend.

La estructura y pnpm quedan aprobados. No se moverá ningún archivo, no se instalará pnpm y no se creará todavía la configuración del workspace.

## 19. Prototipo

`mangazone_v3_responsive.html` se conserva como referencia visual oficial.

No será copiado literalmente como arquitectura del frontend real. Su diseño podrá reutilizarse mediante:

- Componentes.
- Tokens.
- Colores.
- Estructura visual.
- Responsive.
- Estilos adaptados.

El frontend real deberá dividir responsabilidades, consumir datos de la API y aplicar accesibilidad y seguridad compatibles con Next.js, sin perder la identidad visual de MangaZone.

## 20. Entornos

Se prepararán conceptualmente tres entornos separados:

- `development`.
- `staging`.
- `production`.

Cada entorno tendrá:

- Configuración propia.
- Secretos propios.
- Base de datos propia cuando corresponda.

No se deben reutilizar credenciales de producción en desarrollo o staging. El tratamiento de datos reales deberá respetar los controles definidos en `docs/SECURITY_ARCHITECTURE.md`.

### Desarrollo local inicial

MangaZone debe poder desarrollarse inicialmente en el PC local mediante:

- Next.js local.
- NestJS local.
- PostgreSQL local.
- Almacenamiento local o emulación compatible con S3.

Durante esta etapa no se contratarán todavía:

- VPS.
- PostgreSQL administrado.
- Cloudflare de pago.
- Object Storage de pago.
- Redis.

## 21. Variables de entorno

La configuración sensible y dependiente del entorno se proporcionará posteriormente mediante variables de entorno seguras o un gestor de secretos compatible con el hosting.

Nombres conceptuales futuros:

```text
DATABASE_URL
SESSION_SECRET
OBJECT_STORAGE_*
EMAIL_*
REDIS_URL
```

La lista no es definitiva. No se incluyen valores reales, no se crean secretos y no se documentarán credenciales en el repositorio.

## 22. Docker

Docker queda aprobado como mecanismo para hacer reproducible el backend y facilitar despliegues.

### Ventajas

- Entorno de ejecución consistente.
- Versiones controladas de runtime y dependencias del sistema.
- Mayor reproducibilidad entre desarrollo, staging y producción.
- Facilita desplegar en plataformas compatibles con contenedores.
- Ayuda a separar procesos y responsabilidades.

### Posibles inconvenientes

- Añade conceptos operativos y configuración.
- Consume recursos adicionales en entornos pequeños.
- No sustituye la seguridad, monitorización ni gestión de secretos.
- Puede ser innecesario para ciertos proveedores que gestionen directamente el runtime Node.js.
- Requiere mantenimiento de imágenes y proceso de build.

Para MangaZone aportará reproducibilidad, especialmente al backend, y permitirá preparar despliegues compatibles con un VPS o plataforma de contenedores.

La decisión de utilizar Docker está aprobada. No se creará todavía ningún `Dockerfile` ni configuración de contenedores.

## 23. Hosting

La modalidad inicial aprobada para producción es un VPS o una plataforma compatible con Node.js y Docker. No se elige todavía un proveedor concreto.

El hosting futuro deberá soportar:

- Node.js.
- PostgreSQL.
- HTTPS.
- Variables de entorno.
- Almacenamiento o integración con Object Storage.
- Dominio propio.
- Backups.
- Logs.
- Despliegues.
- WebSockets futuros.
- Escalabilidad futura.

### Hosting compartido tradicional

Suele estar orientado a sitios estáticos, gestores de contenido o runtimes limitados. Puede restringir procesos Node.js persistentes, despliegues independientes, variables, WebSockets, tareas en segundo plano y control operativo.

### Hosting, VPS o plataforma compatible con aplicaciones Node.js

Permite ejecutar Next.js y NestJS, gestionar procesos, conectar PostgreSQL y Object Storage, configurar secretos, observar logs y evolucionar hacia WebSockets, workers o despliegues separados.

Una plataforma compatible con aplicaciones Node.js o un VPS administrado resulta conceptualmente más apropiado para MangaZone que un hosting compartido tradicional, porque la arquitectura requiere frontend dinámico, API, procesos persistentes y evolución futura. Esto no selecciona todavía proveedor ni modalidad definitiva.

La base de datos de producción será preferiblemente PostgreSQL administrado. Object Storage y email se consumirán como servicios externos. Los proveedores concretos continúan pendientes.

Flujo de producción aprobado:

```text
Cloudflare
  ↓
VPS o plataforma Node.js/Docker
  ↓
Reverse Proxy — Nginx o equivalente
  ↓
Next.js + NestJS

Servicios externos:
PostgreSQL administrado
Object Storage
Email
```

## 24. Escalabilidad

MangaZone no debe diseñarse para millones de usuarios desde el primer día, pero tampoco debe adoptar decisiones que impidan crecer.

Principio:

```text
empezar simple
+
arquitectura modular
+
escalar componentes cuando exista necesidad real
```

La primera versión puede utilizar una aplicación web, una API modular, una base PostgreSQL y Object Storage. Caché distribuida, colas, WebSockets, réplicas u otras técnicas se añadirán cuando métricas y necesidades reales lo justifiquen.

## 25. Observabilidad

La futura producción necesitará:

- Logs.
- Seguimiento de errores.
- Métricas.
- Alertas.
- Monitorización.

La observabilidad debe abarcar frontend, backend, procesos asíncronos, base de datos e integraciones relevantes, respetando la prohibición de registrar secretos y datos sensibles innecesarios.

No se seleccionan ni implementan herramientas todavía.

## 26. Backups

La arquitectura debe permitir:

- Backups de PostgreSQL.
- Backups o protección de configuración y recursos importantes.
- Restauración comprobable.

La estrategia deberá contemplar acceso restringido, protección y pruebas periódicas de restauración conforme a `docs/SECURITY_ARCHITECTURE.md`.

No se elige todavía proveedor, frecuencia, retención ni configuración definitiva.

## 27. Seguridad

`docs/SECURITY_ARCHITECTURE.md` tiene prioridad para todas las decisiones relacionadas con:

- Autenticación.
- Cookies y sesiones.
- Autorización.
- API.
- Uploads.
- Datos.
- Producción.

Este documento no duplica todas sus reglas. La implementación futura de Next.js, NestJS, PostgreSQL, Prisma, Object Storage, Redis, WebSockets, Docker o hosting deberá contrastarse con esa arquitectura de seguridad.

Si una conveniencia técnica contradice una regla de seguridad, no debe aplicarse automáticamente.

## 28. Decisiones pendientes

Las siguientes decisiones requieren aprobación futura y no se toman automáticamente en este documento:

1. Proveedor concreto de VPS o plataforma compatible con Node.js y Docker.
2. Proveedor concreto de PostgreSQL administrado.
3. Proveedor de Object Storage compatible con S3.
4. Proveedor de email.
5. Plan y configuración concretos de Cloudflare, CDN y WAF.
6. Estrategia OAuth y proveedores autorizados, si se utiliza.
7. Configuración final de sesiones.
8. Herramientas y políticas de monitorización, métricas, errores y alertas.
9. Proveedor, frecuencia, retención y pruebas de backups.
10. Sistema de búsqueda avanzada.
11. Momento y necesidad real para incorporar Redis.
12. Alcance, protocolo y momento de incorporación de WebSockets.
13. Arquitectura, workers, colas, límites y procesamiento futuro de videos.

## 29. Regla para futuro desarrollo

Antes de crear código real deben consultarse, en este orden de obligación conjunta:

1. `docs/MANGAZONE_MASTER_PLAN.md`.
2. `docs/SECURITY_ARCHITECTURE.md`.
3. `docs/TECHNICAL_ARCHITECTURE.md`.

El Plan Maestro define el comportamiento funcional. La Arquitectura de Seguridad define las protecciones obligatorias. Este documento define la arquitectura técnica aprobada y sus límites.

Si existen contradicciones entre los documentos o una implementación requiere una decisión pendiente:

- No asumir.
- No inventar.
- Detener la decisión.
- Solicitar confirmación.

Ninguna tecnología aprobada autoriza a omitir requisitos funcionales o reducir protecciones de seguridad.
