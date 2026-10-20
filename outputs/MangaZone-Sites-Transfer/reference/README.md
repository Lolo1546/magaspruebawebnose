# MangaZone

Proyecto web en español centrado en Manga, Manhwa y Manhua.

## Arquitectura

- Frontend: Next.js + TypeScript.
- Backend: NestJS + TypeScript.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Gestor de paquetes: pnpm.

## Estructura

- `apps/web`: frontend Next.js.
- `apps/api`: backend/API NestJS.
- `packages`: paquetes compartidos mínimos.
- `docs`: documentación oficial.
- `prototype`: referencia visual preservada.
- `infrastructure`: futura configuración de infraestructura.

## Desarrollo

```bash
pnpm install
pnpm dev
```

El frontend utiliza `http://localhost:3000` y la API utiliza `http://localhost:3001` durante el desarrollo.

## Documentación obligatoria

Todo desarrollo futuro debe consultar:

- [Plan maestro](docs/MANGAZONE_MASTER_PLAN.md)
- [Arquitectura de seguridad](docs/SECURITY_ARCHITECTURE.md)
- [Arquitectura técnica](docs/TECHNICAL_ARCHITECTURE.md)

El archivo `prototype/mangazone_v3_responsive.html` es únicamente una referencia visual y no constituye la arquitectura del frontend real.
