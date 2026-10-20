# MangaZone Sites — paquete de transferencia S0.5

Este paquete conserva el contexto funcional y una instantánea de referencia del código fuente de MangaZone para continuar el trabajo en ChatGPT en la nube. **No es un Site creado, un despliegue ni una base de datos migrada.**

## Orden de lectura

1. `MASTER_CONTEXT.md`: visión, estado real, rutas, datos, decisiones y roadmap.
2. `CONTRATOS_FUNCIONALES.md`: operaciones existentes y contratos pendientes por dominio.
3. `ARQUITECTURA_SITES.md`: propuesta, capacidades documentadas e hipótesis que requieren ensayo.
4. `MANIFEST.md` y `MANIFEST.csv`: inventario, procedencia, dependencias y hashes.
5. `INSTRUCCIONES_NUBE.md`: traslado y comienzo de S1.

## Estructura

- `reference/` conserva rutas relativas del repositorio original para que las importaciones y referencias se puedan seguir.
- `reference/apps/web/src/` contiene UI, rutas, estilos, tipos y fixtures de producto identificados.
- `reference/apps/api/src/` y `reference/apps/api/prisma/` contienen contratos de API, dominio, esquema y migraciones **solo como referencia**.
- `reference/docs/` y `reference/designs/` contienen las fuentes documentales y visuales. Los HTML de `designs/` no sustituyen a los componentes productivos ya aprobados.

No se incluyen dependencias instaladas, compilaciones, cachés, `.env`, credenciales ni bases de datos. Los SVG en `reference/apps/web/public/demo/` son recursos abstractos locales, marcados por el propio repositorio como placeholders.
Las pruebas originales se excluyeron: algunas contienen ejemplos sintéticos de credenciales. Su estrategia está descrita en `reference/docs/TESTING_AND_ENV.md` y debe verificarse de nuevo al construir Sites.

## Límite de verificación

S0.5 copió y verificó archivos byte a byte y examinó el ZIP. No ejecutó la aplicación, pruebas, migraciones ni operaciones sobre bases de datos. Los resultados de ejecución indicados como pendientes se deben comprobar en S1 o fases posteriores.
