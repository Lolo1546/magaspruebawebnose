# MangaZone Sites — propuesta técnica inicial para revisión

## Estado de conocimiento

La guía local de Sites disponible durante S0.5 documenta: runtime servidor basado en Cloudflare Workers; D1 para datos estructurados; R2 para archivos; autenticación gestionada por Sites y un starter Vinext para comportamiento servidor. Documenta asimismo 128 MB por isolate y conexiones externas HTTP, sin TCP directo. **Esto no es una prueba de MangaZone dentro de Sites.** No se creó Site, se provisionó base, se subió archivo ni se verificaron despliegues. Las versiones y capacidades concretas deben volver a comprobarse en S1.

## Separación propuesta

| Capa | Responsabilidad | Referencia original | Validación S1 |
| --- | --- | --- | --- |
| UI | Rutas, layouts, estados y accesibilidad | `reference/apps/web/src/app`, `components`, `styles` | Compatibilidad React/Vinext, tipografía, CSS y navegación. |
| Servicios | Casos de uso, paginación, errores y orquestación | `data/` web y servicios NestJS | Contratos de respuesta, cache y tiempos. |
| Dominio | Entidades, estados, invariantes y transiciones | Prisma, DTO, servicios, docs | Reglas expresables sin depender de SQL concreto. |
| Autorización | Identidad, estado, rol, permiso y propiedad por recurso | Guards y authorization NestJS | Identidad de Sites, audiencia, invitado y revocación. |
| Persistencia | Registros, índices, transacciones, cursores y migraciones | PostgreSQL/Prisma, SQL 001–025 | D1 u otra vía admitida: restricciones, carreras y datos reales. |
| Almacenamiento | Assets privados, metadatos, upload y entrega | S3 compatible, intents, finalize | R2, límites, firma/acceso y procesamiento de imagen. |
| Servidor/operación | Endpoints, secretos, colas, email, rate limit, logs | NestJS, Resend, worker PG, memoria | Workers, trabajos durables, secretos, límites y observabilidad. |

## Flujo y contratos que deben preservarse

1. Solicitud pública: ruta → servicio público → filtro editorial/edad → datos paginados y recursos permitidos.
2. Solicitud privada: identidad autenticada → User MangaZone → estado ACTIVE → permiso/propiedad contextual → operación → persistencia/auditoría → respuesta privada sin cache compartido.
3. Upload editorial: permiso → intent → archivo temporal → validación bytes/MIME/dimensiones → asset final privado → referencia transaccional → publicación solo si todas las páginas cumplen invariantes.
4. Reader: publicación visible → páginas autorizadas → entrega privada de media → progreso por User/release con CSRF u otra protección equivalente demostrada.
5. Moderación/editorial: bloqueo o control de versión → revalidación de autoridad/estado → transición y auditoría coherentes → error 409 en conflicto, sin retry silencioso.

## Decisiones abiertas, sin asumir equivalencias

- **Identidad:** Sites sign-in da una identidad de plataforma; debe vincularse a User de producto. No asumir traslado directo de hash de contraseña, sesiones ni IDs entre Sites. Definir estrategia de cuenta y recuperación tras verificar capacidades.
- **Datos:** PostgreSQL usa transacciones, bloqueos, índices parciales, UUIDv7 y `SKIP LOCKED`. D1 puede requerir rediseño de invariantes y cola; ensayar antes de migrar esquema o datos. S0.5 no propone migración de datos.
- **Medios:** `sharp` y el flujo S3 no se consideran portables sin prueba. Verificar tamaño, decodificación, reescritura, storage privado, URLs y TTL en Sites.
- **Proceso en segundo plano:** la cola de reset actual depende de un proceso NestJS persistente; definir mecanismo durable compatible o servicio externo autorizado, sin perder respuesta opaca, token de un uso y revocación.
- **Audiencia:** MangaZone mezcla lectura pública con acciones privadas. Comprobar visibilidad del Site, comportamiento invitado, login y autorización sin confiar en controles de UI.
- **Caché y límites:** preservar aislamiento privado y cache público coherente; sustituir rate limiting en memoria por una solución válida para concurrencia.
- **Hosting futuro:** conservar servicios y dominio con interfaces claras. La evaluación posterior de hosting compartido no debe reducir funciones ni imponer hoy mocks.

## Primer ensayo S1 propuesto

Tras la autorización para construir, crear un Site de prueba y verificar: visitante lee un registro público; dos usuarios autenticados crean/leen registros propios sin acceso cruzado; un rol de prueba recibe y pierde permiso de servidor; archivo privado se almacena y solo se entrega al autorizado; una mutación conflictiva devuelve error estable; secretos permanecen fuera del cliente. Registrar resultados, límites, coste operativo y decisiones de arquitectura antes de trasladar módulos grandes.

## Criterios de diseño y seguridad

Conservar la UI productiva como canon. Reutilizar ideas y código compatible de forma selectiva. Mantener estados de carga/vacío/error; accesibilidad y responsive verificadas en navegador; validaciones y filtros en servidor; privacidad de biblioteca/historial; no exposición de recursos +18; rate limiting y antispam; trazas y auditoría; pruebas de carrera para publicaciones y moderación. No declarar equivalencia por semejanza de API o porque el código compile.
