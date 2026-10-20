# Manifiesto de transferencia S0.5

`MANIFEST.csv` enumera **cada entrada del ZIP**, incluida su ruta original, ruta de transferencia, propósito, importaciones directas detectadas y SHA-256. Los hashes de los documentos generados se incluyen salvo el del propio manifiesto CSV, que se deja vacío por autorreferencia. Las rutas son relativas a este paquete, bajo `reference/` para archivos originales.

## Alcance seleccionado

- HTML de intención visual, no canon productivo: 23 archivo(s).
- adaptadores de datos y fixtures identificados: 43 archivo(s).
- componentes compartidos/visuales: 134 archivo(s).
- configuración o contexto de código fuente: 17 archivo(s).
- contrato y lógica de API/dominio: 290 archivo(s).
- documentación original: 14 archivo(s).
- migraciones y lock histórico, solo referencia: 26 archivo(s).
- modelo y reglas de datos: 4 archivo(s).
- recurso demo local (cinco SVG y README): 6 archivo(s).
- rutas y vistas web: 180 archivo(s).
- tipos y utilidades web: 8 archivo(s).
- tokens y estilos visuales: 2 archivo(s).

Se conserva el código fuente de producción web/API, su esquema y SQL histórico, documentación original, 23 HTML de `designs/` y SVG abstractos creados localmente. Las rutas relativas se mantienen para seguir importaciones. `MANIFEST.csv` registra las importaciones directas como dependencias; importaciones de paquetes externos requieren instalación y adaptación futura y no se copian aquí.

## Exclusiones deliberadas

- `node_modules`, `.pnpm-store`, `.next`, `dist`, builds, cachés, logs y archivos temporales.
- `.git`, commits/credenciales Git y cualquier `.env` o `.env.example`.
- Tests y fixtures ejecutables: contienen ejemplos sintéticos de contraseñas/URLs con credenciales. Se documenta su estrategia, pero se excluyen para cumplir la restricción de no incluir credenciales. La ausencia de pruebas copiadas no significa que el código original carezca de ellas.
- Bases de datos, dumps, datos de usuarios, medios reales, fuentes binarias y recursos remotos. No se descargó arte externo; los SVG incluidos son placeholders locales descritos como tales por el repositorio.
- HTML de prototipos raíz y `prototype/`: se conservaron los 23 diseños solicitados dentro de `designs/` y el código visual productivo para evitar variantes redundantes.
- Lockfile de instalación: el snapshot es referencia para adaptación, no un proyecto para instalar y arrancar sin cambios.

## Cuestiones visuales pendientes

- Home productiva tiene composición aprobada, pero datos fixture que deberán sustituirse por fuentes persistentes.
- `designs/phase-3a/03-lector1.html` introduce la identidad «Sumi Reader»; su relación con el lector productivo requiere decisión de diseño.
- Login/registro, reviews, reportes, notificaciones y funciones sociales sin pantalla productiva suficiente requieren diseño aprobado.
- Las portadas demo SVG no son arte definitivo ni licencia para copiar portadas de terceros.

## Límites de uso

Este paquete no contiene un Site, dependencias instaladas, datos migrados ni pruebas de ejecución. Los archivos SQL son referencia histórica: no aplicarlos automáticamente a D1 u otra base. Ver `ARQUITECTURA_SITES.md` para validaciones S1.
