# MangaZone — Arquitectura de Seguridad

Este documento es obligatorio para toda futura implementación de frontend, backend, API, base de datos, uploads, autenticación, mensajería, moderación y hosting de MangaZone.

No define todavía una arquitectura concreta de hosting. Las decisiones que dependen del stack o de la infraestructura real deberán confirmarse cuando estos hayan sido seleccionados.

## 1. Principio general

MangaZone debe utilizar seguridad por capas (*Defense in Depth*). No debe existir una única medida de seguridad considerada suficiente.

Toda funcionalidad debe diseñarse bajo los principios de:

- Mínimo privilegio.
- Denegar por defecto.
- Validación del lado del servidor.
- No confiar en el cliente.
- Separación de responsabilidades.
- Reducción de superficie de ataque.
- Protección de datos.
- Registro de acciones sensibles.
- Actualización continua.

Nunca se debe asumir que ocultar un botón, una URL o un elemento del frontend equivale a seguridad.

## 2. Frontend no confiable

El navegador del usuario debe considerarse un entorno no confiable.

El usuario podrá inspeccionar:

- HTML.
- CSS.
- JavaScript enviado al navegador.
- Solicitudes de red.
- Respuestas recibidas.
- Recursos públicos.

No se deben intentar utilizar como mecanismos reales de seguridad:

- Bloqueo de F12.
- Bloqueo de clic derecho.
- Detección de DevTools.
- Ocultación de código mediante JavaScript.

El frontend nunca debe contener:

- Contraseñas.
- Claves privadas.
- Secretos.
- Credenciales de base de datos.
- Tokens administrativos.
- Claves privadas de servicios.
- Reglas de autorización consideradas secretas.

La seguridad debe depender del backend.

## 3. HTTPS

Producción debe utilizar HTTPS obligatoriamente. HTTP normal no debe utilizarse para sesiones autenticadas.

HTTPS deberá configurarse correctamente y se considerará HSTS cuando el dominio esté preparado.

Toda cookie sensible deberá utilizar `Secure`.

## 4. Contraseñas

Las contraseñas nunca deben:

- Almacenarse en texto plano.
- Registrarse en logs.
- Enviarse en respuestas.
- Guardarse en `localStorage`.
- Almacenarse mediante cifrado reversible como mecanismo principal.

Se debe utilizar hashing de contraseña moderno. La preferencia inicial es **Argon2id**.

Los parámetros concretos deberán configurarse usando las recomendaciones actuales de OWASP y probarse en la infraestructura final.

No se deben implementar algoritmos criptográficos personalizados. Se utilizarán librerías mantenidas y ampliamente auditadas.

Cada contraseña deberá utilizar un salt adecuado gestionado por la implementación segura correspondiente. Podrá considerarse un pepper como defensa adicional almacenado fuera de la base de datos.

## 5. Política de contraseñas

- No imponer reglas absurdamente complejas que reduzcan usabilidad.
- Permitir contraseñas largas.
- Evitar límites de longitud innecesariamente pequeños.
- Comprobar contraseñas comprometidas cuando sea posible en una futura implementación.
- Evitar preguntas de seguridad tradicionales.
- Permitir gestores de contraseñas.

## 6. Sesiones

Las sesiones autenticadas deberán usar un mecanismo seguro.

La preferencia es utilizar cookies de sesión protegidas con:

- `HttpOnly`.
- `Secure`.
- `SameSite` apropiado.
- `Path` restringido cuando corresponda.

No se debe almacenar el identificador principal de sesión en `localStorage` si una arquitectura basada en cookies `HttpOnly` resulta viable.

Los IDs de sesión deben ser:

- Criptográficamente aleatorios.
- Impredecibles.
- Suficientemente largos.

La sesión debe regenerarse después de:

- Login.
- Elevación de privilegios.
- Cambios críticos de autenticación.

## 7. Expiración de sesiones

Debe existir:

- Tiempo máximo de sesión.
- Expiración por inactividad cuando corresponda.
- Cierre de sesión.
- Cierre de todas las sesiones.
- Revocación individual de dispositivos.

Las sesiones de Administradores y Moderadores podrán tener políticas más estrictas.

## 8. Autenticación

El backend debe controlar toda autenticación.

Flujos futuros:

- Registro.
- Verificación de correo.
- Login.
- Logout.
- Recuperación de contraseña.
- Cambio de contraseña.
- 2FA.
- Eliminación de cuenta.

Nunca se debe revelar innecesariamente si un correo existe. Deben evitarse respuestas diferentes que faciliten enumeración de cuentas.

No usar:

> El correo existe pero la contraseña es incorrecta.

Se deben preferir mensajes generales según el contexto.

## 9. Recuperación de contraseña

La política de recuperación aplica las siguientes medidas obligatorias:

- **Antienumeración y Error Genérico:** Respuestas opacas ante usuarios inexistentes (`{ "accepted": true }` / 200 OK) y un `InvalidPasswordResetTokenError` genérico ante tokens inválidos, expirados o ya consumidos. Errores técnicos inesperados no se ocultan.
- **Protecciones de Red:** Uso de `OriginGuard` y rate limits estrictos (ej. 3/3600 para emisión y 5/900 para consumo). No utilizan `CsrfGuard` al ser endpoints públicos.
- **Generación y Hashing:** Tokens de mínimo 32 bytes de entropía. Solo se almacena el hash criptográfico (SHA-256) en la tabla principal; el token raw nunca existe en texto plano at rest. Durante reintentos de delivery existe una representación reversible cifrada (AES-256-GCM con AAD ligado a `jobId` y `passwordResetTokenId`), la cual se redacta obligatoriamente al alcanzar un estado terminal (`COMPLETED` o `FAILED`).
- **Consumo y PostgreSQL:** Un único consumo garantizado por transacción atómica con `updateMany` condicional y constraints (UUIDv7, unicidad del hash, exclusión mutua de estados temporales).
- **Callback e Idempotencia:** El envío de email ocurre en un callback **post-commit**, de modo que fallos de red (`EmailDeliveryError`) no fuerzan retries de la base de datos (como el P2034) ni ocultan que el usuario quedó con token válido. Usa idempotency keys.
- **Revocación:** Al consumirse el token, el backend revoca **automática y obligatoriamente** todas las sesiones activas del usuario (no es opcional) y **no** inicia sesión nueva automáticamente.
- **Transmisión Segura:** El token viaja exclusivamente en la URL dentro de un fragmento hash (`#token=...`), nunca como string de consulta.

Ver detalles adicionales en la [API de autenticación](./API_AUTHENTICATION.md).

## 10. 2FA

2FA será opcional para usuarios normales inicialmente.

Cuando el sistema real esté en producción, 2FA deberá ser obligatorio para:

- Administradores.
- Moderadores.

Se deben preferir estándares como TOTP o soluciones modernas compatibles.

Los secretos 2FA deben guardarse de forma protegida y se deben proporcionar códigos de recuperación seguros.

Las acciones críticas podrán solicitar reautenticación.

## 11. Roles y autorización

Toda autorización debe realizarse en backend.

Roles principales:

- Visitante.
- Usuario.
- Grupo verificado por MangaZone.
- Moderador.
- Administrador.

Los Moderadores tendrán permisos específicos por área.

El backend debe verificar en cada operación:

- Usuario autenticado.
- Identidad.
- Rol.
- Permisos.
- Recurso.
- Relación con el recurso.
- Estado de cuenta.

Nunca se debe depender únicamente de una comprobación como `role === "admin"` en el frontend.

## 12. Denegar por defecto

Toda acción no autorizada explícitamente debe ser rechazada: *deny by default*.

Ejemplo:

```http
DELETE /api/users/{id}
```

Debe estar prohibido para cualquier usuario salvo aquellos con permiso explícito.

El hecho de conocer una URL o un ID nunca concede acceso.

## 13. Protección contra IDOR / BOLA

Nunca se debe permitir acceso a recursos simplemente porque el usuario modifica un ID.

Ejemplo:

```text
/api/messages/100
/api/messages/101
```

El backend debe comprobar que el usuario pertenece realmente a la conversación correspondiente.

Esta regla debe aplicarse a:

- Usuarios.
- Mensajes.
- Comunidades.
- Proyectos.
- Fan-Art.
- Listas.
- Biblioteca.
- Reportes.
- Moderación.
- Capítulos.
- Solicitudes.

## 14. API

Toda API debe validar:

- Autenticación.
- Autorización.
- Formato.
- Tamaño.
- Tipo.
- Límites.
- Contenido.

No se debe confiar en datos enviados por el frontend. Se aplicará validación tanto sintáctica como semántica.

Nunca se deben exponer campos internos innecesarios. Se utilizarán DTOs, serialización explícita o un mecanismo equivalente.

Una API de perfil público no debe devolver:

- `password_hash`.
- Email privado.
- Tokens.
- Permisos internos.
- Datos administrativos.

## 15. CORS

CORS deberá configurarse con una allowlist explícita.

Nunca se debe utilizar lo siguiente en endpoints autenticados con credenciales:

```http
Access-Control-Allow-Origin: *
```

Los orígenes autorizados deberán definirse según la arquitectura real.

CORS no debe considerarse un mecanismo de autenticación. Una petición realizada fuera de un navegador puede ignorar CORS, por lo que la API siempre debe aplicar autenticación y autorización.

## 16. CSRF

Si MangaZone utiliza cookies de sesión para autenticación, las operaciones que modifican estado deberán protegerse contra CSRF.

Se combinarán, según la arquitectura:

- `SameSite`.
- Tokens CSRF.
- Validación de `Origin`/`Referer` cuando corresponda.
- Protección nativa del framework.

No se deben utilizar solicitudes GET para acciones destructivas.

## 17. XSS

Todo contenido introducido por usuarios debe considerarse no confiable.

Ejemplos:

- Nombre.
- Bio.
- Comentarios.
- Posts.
- Comunidades.
- Mensajes.
- Títulos.
- Reviews.
- Metadatos de Fan-Art.
- Nombres de grupos.

Se debe utilizar:

- *Output encoding*.
- Sanitización.
- APIs DOM seguras.
- Plantillas seguras.

Se debe evitar `innerHTML` con contenido de usuario.

Si se permite Markdown o HTML limitado, se utilizará una sanitización robusta y una allowlist estricta.

## 18. Content Security Policy

Producción deberá utilizar Content Security Policy.

Objetivos:

- Restringir scripts.
- Restringir conexiones.
- Restringir imágenes.
- Bloquear recursos inesperados.
- Reducir el impacto de XSS.
- Impedir framing no autorizado.

Se debe preferir una política estricta y evitar depender permanentemente de `'unsafe-inline'` y `'unsafe-eval'` cuando la arquitectura permita eliminarlos.

La política concreta se definirá una vez conocido el frontend real.

## 19. Clickjacking

MangaZone no deberá poder incluirse arbitrariamente dentro de iframes de otros dominios.

Se utilizará `Content-Security-Policy frame-ancestors` y mecanismos equivalentes cuando sean necesarios.

## 20. Headers de seguridad

Se deberán evaluar y configurar correctamente:

- `Content-Security-Policy`.
- `Strict-Transport-Security`.
- `X-Content-Type-Options`.
- `Referrer-Policy`.
- `Permissions-Policy`.
- `Cross-Origin-Resource-Policy` cuando corresponda.

No se deben copiar configuraciones sin entender su efecto.

## 21. Peticiones externas

Las APIs internas y los endpoints privados deberán rechazar peticiones no autorizadas.

No se debe intentar bloquear Internet completo únicamente mediante comprobación del header `Origin`.

Se utilizarán:

- Autenticación.
- Autorización.
- Tokens o sesiones.
- Firewall.
- Rate limiting.
- Red privada cuando corresponda.
- WAF.
- Reglas de infraestructura.

Los endpoints administrativos podrán disponer de protecciones adicionales.

## 22. Rate limiting

Se implementarán límites para reducir:

- Fuerza bruta.
- Spam.
- Scraping abusivo.
- Enumeración.
- Abuso de APIs.
- DoS a nivel de aplicación.

Se aplicará especialmente a:

- Login.
- Registro.
- Recuperación de contraseña.
- Verificación de email.
- Mensajes.
- Comentarios.
- Publicaciones.
- Uploads.
- Búsquedas costosas.
- Reportes.
- Endpoints administrativos.

Los valores concretos implementados son:

- `FORGOT_PASSWORD_IP` = 3 / 3600
- `FORGOT_PASSWORD_AUTH_EMAIL` = 3 / 3600
- `RESET_PASSWORD_IP` = 5 / 900
- `LOGIN_IP` = 20 / 900
- `LOGIN_AUTH_EMAIL` = 5 / 3600
- `REGISTER_IP` = 5 / 3600
- `RESEND_VERIFICATION_USER` = 3 / 3600
- `VERIFY_EMAIL_IP` = 10 / 900

Limitación técnica actual: El storage actual es in-memory y por lo tanto apropiado para procesos únicos. Un restart limpia los buckets. Varias réplicas dividirán los límites. Antes de permitir escalamiento horizontal, se deberá migrar a un storage distribuido, pero actualmente no se introduce Redis.

## 23. Protección contra brute force

El login deberá contemplar:

- Rate limiting.
- Backoff progresivo.
- Detección de comportamiento sospechoso.
- Alertas.

- 2FA.

Se deben evitar bloqueos permanentes basados únicamente en el username que permitan provocar DoS contra otras cuentas.

## 24. Base de datos

La base de datos nunca deberá exponerse directamente a Internet si la infraestructura permite mantenerla privada.

Solo el backend autorizado deberá comunicarse con ella.

Se utilizarán:

- Consultas parametrizadas.
- ORM seguro o *prepared statements*.
- Cuenta de base de datos con mínimo privilegio.
- Conexiones cifradas cuando corresponda.

Nunca se concatenará directamente input del usuario dentro de SQL.

## 25. Secretos

Todos los secretos deben almacenarse fuera del frontend y fuera del repositorio público.

Ejemplos:

- Credenciales de base de datos.
- Claves API privadas.
- Secretos de sesión.
- Claves de email.
- Credenciales de object storage.
- Secretos OAuth.
- Claves administrativas.

Se utilizarán:

- Variables de entorno seguras.
- Secret manager cuando el hosting lo permita.

### 25.1 Claves de Cifrado Específicas

`PASSWORD_RESET_QUEUE_ENCRYPTION_KEY`:
- **Obligatoria**.
- **Base64URL canónica** que decodifica exactamente a **32 bytes**.
- **Sin default** y **sin fallback**.
- Nunca incluir el valor real en repositorios ni logs.
- **Rotación**: No rotarla abruptamente mientras haya jobs activos en la cola. Los jobs deben drenarse primero o el nuevo código debe mantener compatibilidad con la key anterior; de lo contrario, se perderá la capacidad de descifrar el material de email pendiente.

Nunca se incluirán secretos reales en:

- HTML.
- JavaScript cliente.
- Commits.
- Documentación.
- Ejemplos públicos.

Se mantendrá un `.env.example` sin secretos reales cuando corresponda.

## 26. Uploads

MangaZone permitirá uploads en diversas áreas.

Ejemplos futuros:

- Avatares.
- Banners.
- Fan-Art.
- Imágenes de comunidades.
- Logos de grupos.
- GIF.
- Videos.
- Portadas autorizadas.

Todo upload debe considerarse hostil.

Se validarán:

- Tipo MIME real.
- Extensión.
- Tamaño.
- Dimensiones.
- Estructura.
- Nombre.
- Contenido.

No se debe confiar únicamente en la extensión del archivo.

## 27. Nombres de archivos

No se debe utilizar directamente el nombre proporcionado por el usuario como ruta final. Se generarán identificadores seguros.

Se debe evitar:

- Path traversal.
- Nombres ejecutables.
- Caracteres inesperados.
- Sobrescritura arbitraria.

Nunca se permitirá que un upload controle libremente una ruta del servidor.

## 28. Almacenamiento de archivos

Se debe preferir almacenamiento separado del servidor de aplicación.

Ejemplo futuro:

```text
object storage + CDN
```

Los uploads de usuarios no deben ejecutarse como código.

Se debe evitar servir uploads de forma que `.php`, `.js`, `.html`, `.exe` u otros formatos peligrosos puedan ejecutarse arbitrariamente.

El `Content-Type` debe configurarse de forma segura.

## 29. Procesamiento de imágenes

Cuando sea viable, las imágenes subidas deberán:

- Decodificarse.
- Validarse.
- Recodificarse.

Esto reducirá contenido embebido inesperado.

Se eliminará metadata innecesaria cuando corresponda, especialmente EXIF sensible.

## 30. Malware

Se evaluará análisis antimalware para los archivos que lo justifiquen.

Flujo posible:

```text
upload
→ cuarentena
→ análisis
→ procesamiento
→ publicación
```

No se implementará todavía hasta definir la infraestructura.

## 31. Videos

Los videos requerirán controles adicionales en futuras versiones:

- Tipo.
- Duración.
- Tamaño.
- Codecs aceptados.
- Procesamiento.
- Transcodificación.
- Almacenamiento.
- Moderación.

Nunca se ejecutarán archivos de video como código.

## 32. Contenido +18

El control +18 debe aplicarse en backend.

Un usuario sin autorización no debe recibir el archivo explícito original para luego ocultarlo solamente con CSS.

El frontend puede mostrar un placeholder. El backend debe verificar el permiso antes de entregar un recurso restringido.

Esto se aplicará a:

- Portadas.
- Páginas.
- Recursos relacionados.

La configuración +18 debe almacenarse de forma segura asociada a la cuenta.

## 33. Mensajería

Los mensajes privados deben requerir autorización por conversación.

Un usuario solo puede leer mensajes de conversaciones a las que pertenece. Nunca se debe permitir enumeración de mensajes mediante IDs.

Se aplicarán:

- Autorización.
- Rate limiting.
- Límites de tamaño.
- Validación de archivos.
- Bloqueo.
- Reportes.

Los Moderadores no deben poder navegar libremente por conversaciones privadas. Solo deben recibir el contexto necesario cuando exista un reporte autorizado según la política.

## 34. Cultivo

El valor de Cultivo debe calcularse o validarse en backend.

No se debe confiar en un contador enviado por el frontend. Los usuarios no deben poder modificar directamente un valor como:

```text
cultivoDays = 9999
```

El backend determina si ocurrió una interacción válida.

## 35. Niveles, XP y reputación

Todos estos valores deben calcularse en el backend.

El cliente nunca debe poder indicar:

```text
xp = ...
level = ...
reputation = ...
```

Toda modificación debe derivar de eventos legítimos y reglas del servidor. Se añadirán medidas contra spam y abuso.

## 36. Moderación

Las acciones de Moderadores deben requerir autorización del backend.

Cada acción sensible debe registrar:

- Moderador.
- Acción.
- Objetivo.
- Timestamp.
- Motivo.
- Contexto relevante.

Los Moderadores no pueden modificar ni eliminar sus propios logs.

## 37. Administrador

El Administrador representa el mayor nivel de privilegio.

Requisitos futuros mínimos:

- 2FA obligatorio.
- Contraseña fuerte.
- Sesiones controladas.
- Reautenticación para acciones críticas.
- Logs completos.
- Alertas de seguridad.

Acciones particularmente sensibles:

- Otorgar permisos.
- Retirar permisos.
- Eliminar o suspender Moderadores.
- Cambiar configuración crítica.
- Acciones masivas.
- Operaciones de datos.

## 38. Panel Admin

La existencia de una URL `/admin` no constituye un problema por sí misma. La seguridad debe estar basada en autorización y no en una URL secreta.

Toda ruta administrativa:

- Requiere autenticación.
- Requiere autorización.
- Requiere protección CSRF cuando corresponda.
- Genera logs.
- Aplica rate limiting cuando corresponda.

## 39. Logs

Se registrarán eventos de seguridad como:

- Login.
- Login fallido.
- Logout.
- Recuperación.
- Cambio de contraseña.
- Cambio de email.
- 2FA.
- Permisos.
- Moderación.
- Eliminación de cuenta.
- Acciones administrativas.

Nunca se registrarán:

- Contraseñas.
- Tokens completos.
- Secretos.
- Códigos 2FA activos.
- Datos sensibles innecesarios.

## 40. Auditoría

Los logs de seguridad deben tener controles contra manipulación.

Las acciones administrativas y de moderación deben poder auditarse.

Se definirán posteriormente:

- Retención.
- Acceso.
- Anonimización.
- Exportación.
- Alertas.

## 41. Backups

Producción debe disponer de backups automatizados.

Se contemplarán:

- Base de datos.
- Configuración crítica.
- Contenido necesario.

Los backups deberán:

- Protegerse.
- Cifrarse cuando corresponda.
- Tener acceso restringido.
- Someterse a pruebas periódicas de restauración.

Un backup no comprobado no debe considerarse suficiente.

## 42. Dependencias

Se utilizarán dependencias:

- Mantenidas.
- Conocidas.
- Necesarias.

Se deben evitar librerías innecesarias y mantener las versiones actualizadas.

Se ejecutarán análisis de dependencias y vulnerabilidades durante el desarrollo y en CI/CD cuando corresponda.

No se ignorarán vulnerabilidades conocidas sin evaluación.

## 43. Supply chain

El proyecto debe protegerse frente a compromisos de dependencias.

Se considerarán:

- Lockfiles.
- Revisión de paquetes.
- Evitar paquetes desconocidos.
- Versiones fijadas.
- Escaneo de dependencias.
- Protección del repositorio.
- Revisión de cambios.

## 44. Repositorio

Cuando se utilice Git:

- No subir secretos.
- Utilizar `.gitignore`.
- Proteger ramas importantes.
- Revisar pull requests.
- Conservar historial.
- Utilizar protección de ramas cuando el repositorio remoto lo permita.

Las credenciales filtradas deben rotarse; no basta con eliminarlas del commit más reciente.

## 45. Email y phishing

Cuando MangaZone utilice correo con dominio propio deberá configurar:

- SPF.
- DKIM.
- DMARC.

Los correos oficiales nunca deben solicitar:

- Contraseña.
- Código 2FA completo.
- Secretos.

Las comunicaciones deben enseñar a los usuarios a comprobar el dominio correcto.

## 46. Dominio

El dominio oficial debe utilizar HTTPS.

Se deben evitar dominios visualmente confusos cuando sea posible.

La renovación del dominio y el acceso al registrador deben protegerse fuertemente. La cuenta del registrador deberá utilizar 2FA.

## 47. CDN / WAF

Producción podrá utilizar:

- CDN.
- WAF.
- Protección DDoS.
- Bot management.
- Rate limiting perimetral.

Estas capas complementan, no sustituyen, la seguridad del backend.

## 48. Servidor de origen

Cuando la infraestructura lo permita:

- Reducir la exposición directa.
- Limitar puertos.
- Utilizar firewall.
- Mantener servicios internos privados.
- Aplicar actualizaciones.

No se deben ejecutar servicios innecesarios.

## 49. Principio de mínimo privilegio

Se aplicará a:

- Usuarios.
- Moderadores.
- Administradores.
- Servicios.
- Base de datos.
- Object storage.
- Procesos.
- CI/CD.

Cada componente debe recibir solo los permisos necesarios.

## 50. Datos personales

Se recopilarán únicamente los datos necesarios. No se almacenará información sensible sin necesidad.

Se definirá más adelante:

- Finalidad.
- Retención.
- Eliminación.
- Exportación.
- Acceso.

La implementación final deberá revisarse conforme a las obligaciones legales aplicables a los países donde MangaZone opere.

## 51. Eliminación de cuenta

El período definido funcionalmente es de **7 días**.

Durante ese período, la eliminación puede cancelarse.

Después del plazo:

- Los datos personales correspondientes deben eliminarse o anonimizarse según la política.
- Las publicaciones permanecen asociadas a **“Usuario eliminado”**, salvo solicitud de eliminación aprobada.

Las operaciones de eliminación deben ejecutarse en backend. No deben depender de JavaScript cliente.

## 52. Seguridad de publicaciones

Los usuarios no eliminan directamente publicaciones. Utilizan **“Solicitar eliminación”**.

La solicitud debe:

- Autenticarse.
- Asociarse al propietario.
- Registrarse.
- Pasar a moderación.

Se debe impedir que un usuario solicite arbitrariamente borrar contenido ajeno.

## 53. SSRF

Cuando MangaZone permita importar contenido desde URLs externas en el futuro, se deberá considerar el riesgo SSRF.

No se permitirá que usuarios provoquen solicitudes arbitrarias desde el servidor hacia:

- `localhost`.
- Redes privadas.
- Metadata cloud.
- Servicios internos.

Se utilizarán allowlists y validación cuando esa funcionalidad exista.

## 54. Open redirects

Las redirecciones deben validarse.

No se permitirán parámetros como el siguiente sin validación:

```text
?redirect=https://sitio-malicioso.com
```

Se preferirán destinos internos o una allowlist.

## 55. Webhooks

Si en el futuro se implementan webhooks, se deberá:

- Verificar firmas.
- Autenticar el origen.
- Prevenir replay.
- Validar el payload.
- Limitar su tamaño.
- Registrar errores.

## 56. Serialización

No se deben deserializar objetos no confiables utilizando mecanismos peligrosos.

Se deben preferir formatos simples como JSON y schemas de validación.

## 57. Errores

Producción no debe mostrar:

- Stack traces completos.
- Rutas internas.
- Secretos.
- Queries SQL.
- Detalles internos.

Los usuarios recibirán errores apropiados. Los detalles técnicos irán a logs protegidos.

## 58. Enumeración

Se debe evitar que las APIs permitan descubrir:

- Usuarios privados.
- Emails.
- Mensajes.
- IDs secuenciales sensibles.
- Recursos internos.

Los IDs públicos podrán utilizar identificadores no predecibles cuando esto aporte seguridad adicional, pero nunca sustituirá la autorización.

## 59. Privacidad por defecto

Las configuraciones sensibles deberán utilizar valores predeterminados seguros.

Ejemplos:

- Historial privado.
- +18 deshabilitado.
- Contenido explícito oculto.
- Mensajes de desconocidos restringidos según la política.
- Ubicación no pública.

## 60. Seguridad de WebSockets

Si en el futuro Mensajes o Chat utiliza WebSockets, se deberá:

- Autenticar la conexión.
- Autorizar canales.
- Validar cada mensaje.
- Limitar su tamaño.
- Aplicar rate limiting.
- Comprobar el origen permitido.
- Desconectar sesiones revocadas.

No se debe asumir que una conexión autenticada permite cualquier acción.

## 61. Antispam y abuso

El diseño debe contemplar:

- Spam.
- Bots.
- Cuentas masivas.
- Flooding.
- Reportes falsos.
- Manipulación de XP.
- Manipulación de Cultivo.
- Likes artificiales.
- Scraping abusivo.

Se combinarán:

- Rate limiting.
- Reputación.
- Verificación.
- Detección.
- Moderación.

## 62. Protección contra clonado

Se acepta que el HTML, CSS y JavaScript enviados al navegador pueden copiarse. La estrategia de MangaZone no será “ocultar el frontend”.

La protección real consiste en mantener privados:

- Backend.
- Base de datos.
- Algoritmos sensibles.
- Credenciales.
- Datos.
- APIs privadas.
- Infraestructura.
- Secretos.

Un sitio clonado no debe poder reutilizar MangaZone como backend sin autenticación y autorización.

Se aplicarán:

- Permisos.
- CORS correctamente configurado.
- Rate limiting.
- Tokens o sesiones.
- WAF.
- Protección de recursos privados.

## 63. Scraping

El contenido público puede ser técnicamente descargado por quien pueda visualizarlo. No se debe prometer protección absoluta.

El scraping abusivo se reducirá mediante:

- Rate limiting.
- CDN.
- WAF.
- Bot detection.
- Paginación.
- Límites de API.
- Caché.
- Monitorización.

Los recursos privados o restringidos podrán utilizar URLs autorizadas o temporales según la arquitectura futura.

## 64. Monitorización

Producción debe tener monitorización de:

- Disponibilidad.
- Errores.
- Rendimiento.
- Seguridad.
- Abuso.
- Recursos.

Se definirán alertas para comportamiento anómalo.

## 65. Incident response

Antes del lanzamiento público debe existir un procedimiento básico de incidentes:

1. Detectar.
2. Contener.
3. Investigar.
4. Corregir.
5. Recuperar.
6. Comunicar cuando corresponda.
7. Documentar.
8. Evitar la repetición.

## 66. Entornos

Se deben separar:

- Desarrollo.
- Staging.
- Producción.

Nunca se utilizarán datos reales de usuarios en desarrollo sin controles adecuados.

Las credenciales deben ser distintas por entorno.

## 67. Producción

Antes de producción se debe realizar:

- Revisión de configuración.
- Análisis de dependencias.
- Pruebas de autenticación.
- Pruebas de autorización.
- Pruebas de uploads.
- Pruebas XSS.
- Pruebas CSRF.
- Pruebas IDOR/BOLA.
- Pruebas SQLi.
- Pruebas de rate limiting.
- Pruebas de acceso +18.
- Pruebas de recuperación de cuenta.
- Pruebas de permisos de Moderadores.
- Revisión del panel Admin.
- Prueba de backup/restore.
- Revisión de headers.

## 68. Estándares de referencia

La implementación deberá contrastarse con fuentes reconocidas como:

- OWASP ASVS.
- OWASP Cheat Sheet Series.
- OWASP Top 10.
- Documentación oficial del framework seleccionado.
- Documentación oficial de la base de datos.
- Documentación oficial del hosting.

No se deben copiar snippets de blogs desconocidos para componentes sensibles sin revisión.

## 69. Reglas para desarrolladores

Antes de implementar cualquier funcionalidad sensible:

1. Leer `docs/MANGAZONE_MASTER_PLAN.md`.
2. Leer `docs/SECURITY_ARCHITECTURE.md`.
3. Identificar riesgos.
4. Utilizar mecanismos de seguridad propios del framework cuando sean adecuados.
5. No implementar criptografía personalizada.
6. No introducir secretos en código.
7. No reducir una protección existente sin autorización.
8. No asumir decisiones no documentadas.

Si existe conflicto entre funcionalidad y seguridad, se debe detener el trabajo y solicitar una decisión.

## 70. Revisión de seguridad

Este documento no debe considerarse definitivo para siempre.

Debe actualizarse cuando:

- Cambie la arquitectura.
- Cambie el hosting.
- Se agreguen nuevas funciones.
- Se agregue chat.
- Se agreguen videos.
- Cambie la autenticación.
- Existan nuevas amenazas relevantes.

La seguridad de MangaZone es un proceso continuo.

## Decisiones pendientes para una fase futura

Los siguientes puntos necesitan una decisión posterior porque dependen de la arquitectura, infraestructura, políticas o requisitos legales que aún no se han aprobado:

- Stack de frontend, backend/API y framework, necesarios para concretar protecciones nativas.
- Arquitectura de sesiones y valor exacto de `SameSite`.
- Parámetros de Argon2id adecuados para la infraestructura final y posible uso de pepper.
- Tiempos máximos, inactividad y políticas diferenciadas de sesión.
- Estándar o solución concreta de 2FA y protección de sus secretos.
- Orígenes autorizados de CORS.
- Política CSP definitiva y headers concretos compatibles con el frontend real.
- Límites exactos de rate limiting, backoff y prevención de abuso.
- Infraestructura de almacenamiento, CDN, WAF, object storage y análisis antimalware.
- Tipos, tamaños, dimensiones, codecs y procesamiento permitidos para uploads.
- Política de retención, acceso, anonimización, exportación y alertas de logs.
- Frecuencia, retención, cifrado y estrategia de restauración de backups.
- Hosting, topología de red, firewall, exposición del origen y servicios privados.
- Jurisdicciones aplicables y políticas de datos personales.
- Estrategia futura de URLs autorizadas o temporales para recursos restringidos.
- Umbrales y alertas de monitorización e incident response.
