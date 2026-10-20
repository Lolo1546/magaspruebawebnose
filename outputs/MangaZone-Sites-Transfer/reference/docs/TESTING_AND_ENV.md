# MangaZone — Entorno de Pruebas y Desarrollo Local

Este documento especifica la infraestructura de base de datos local y la estrategia de testing de integración.

Storage/upload 4.3A: configuración privada, límites COVER y pruebas aisladas en [STORAGE_UPLOADS.md](STORAGE_UPLOADS.md).

## 1. Entornos de Base de Datos Local

MangaZone requiere instalaciones de PostgreSQL para desarrollo e integración con un aislamiento estricto.

### 1.1 Requisitos Obligatorios

Para ejecutar los tests de integración, el entorno debe cumplir estrictamente con:

- **PostgreSQL accesible:** Un servidor PostgreSQL disponible para las pruebas.
- **Base de datos exclusiva:** Una base de datos dedicada exclusivamente a tests. Su nombre debe terminar obligatoriamente en `_test`.
- **Aislamiento de URLs:** Las variables `DATABASE_URL` y `TEST_DATABASE_URL` deben apuntar a bases de datos distintas.
- **Protección de Producción:** Nunca utilizar una base de datos de producción o desarrollo (los nombres que contengan `prod` son rechazados por seguridad).
- **Permisos:** El rol utilizado debe tener permisos suficientes para aplicar migraciones, ejecutar `TRUNCATE` en las tablas y realizar las operaciones de los tests.
- **Soporte ICU:** La migración `018_editorial_foundation` usa una collation ICU para normalización Unicode. Antes de aplicarla, el smoke de migración debe verificar que PostgreSQL dispone del provider ICU. El PostgreSQL local/de pruebas actual cumple este requisito; cualquier imagen o servicio elegido para producción debe preservarlo.
- **Setup y Validación:** El script de configuración (`test/setup.ts`) valida proactivamente estas URLs antes de permitir que la inyección proceda.
- **Ejecución Serial:** Los tests deben ejecutarse con `--runInBand` para evitar colisiones.

### 1.2 Ejemplo Local Recomendado

Para el entorno de desarrollo local, se sugiere la siguiente configuración de ejemplo (adapte estos valores a su entorno):

- **Desarrollo:** Una base llamada `mangazone_dev` para desarrollo activo.
- **Integración:** Una base llamada `mangazone_test`.
- **Rol de Tests:** Un usuario no privilegiado (por ejemplo, con el nombre sugerido `mangazone_test_runner`) con acceso únicamente a la base de pruebas.
- **Autenticación:** Un mecanismo seguro recomendado como SCRAM-SHA-256.

## 2. Pruebas de Integración (PostgreSQL)

Los tests de integración comprueban la correcta interacción del backend con PostgreSQL (incluyendo transacciones, bloqueos, restricciones y queries).

### 2.1 Ejecución

Para ejecutar los tests de integración en la carpeta `apps/api`:

```bash
pnpm run test:int
```

Este comando asegura que Prisma y Jest operan sobre la base de datos de pruebas (inyectando `TEST_DATABASE_URL`), y utiliza `--runInBand` para evitar colisiones concurrentes en el entorno, ya que varias pruebas podrían competir por el mismo estado de base de datos y truncamientos de tablas.

### 2.2 Estrategia de Setup y Limpieza
Los tests individuales se encargan de configurar el entorno de base de datos, incluyendo la ejecución de utilidades como `resetDb()` (que ejecuta un `TRUNCATE TABLE "User" CASCADE`) en sus hooks de ciclo de vida (`beforeEach` o `beforeAll`). El archivo `test/setup.ts` NO ejecuta `resetDb()` de forma automática global.

### 2.3 Patrones Comunes de Test
Los tests de integración cubren:
- Operaciones atómicas.
- Reintentos y concurrencia.
- Rollbacks de base de datos probados mediante una violación `unique` real inyectada dentro de la transacción, lo que verifica que PostgreSQL revierte atómicamente la invalidación del token anterior, la creación del token nuevo y el `SecurityAuditEvent`.
- El callback de email (en el worker) se ejecuta estrictamente **después del commit** de transacción; si la transacción falla, el callback no se ejecuta. Inversamente, un fallo del callback no revierte la transacción ya confirmada. No se utilizaron callbacks fallidos para provocar rollbacks, ni el callback participa de la transacción principal.
- Durable enqueue, endpoint opacity, worker claim, concurrent workers, lease recovery, stale fencing, issuance, rollback, retry delivery, permanent failure, idempotency, ciphertext swapping, purge, cleanup.

Nota sobre P2034 (concurrencia de inserción PostgreSQL): Está cubierto mediante pruebas unitarias. No se afirma observación determinística real de este error directamente sobre la conexión PostgreSQL en tests de integración.

## 3. Cobertura de Tests (Actualizado)

- **API unit:** 39 suites, 569 tests, 0 snapshots.
- **API integration:** 2 suites, 32 tests, 0 snapshots.
- **Web:** 2 files, 47 tests, 0 snapshots.
