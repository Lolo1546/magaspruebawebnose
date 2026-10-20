# MangaZone — API de Autenticación

Este documento describe los endpoints y flujos técnicos relacionados con la autenticación y la seguridad de cuentas en la API de MangaZone.

## 1. Recuperación de Contraseña

El restablecimiento de contraseñas se implementa con estrictas garantías de seguridad, transaccionalidad y límites de tasa (rate limits).

### 1.1 `POST /auth/forgot-password`

Endpoint público para solicitar el restablecimiento de contraseña.

**Request:**
- Body DTO: `{ "email": "usuario@ejemplo.com" }`

**Respuestas:**
- **200 OK:** `{ "accepted": true }`
  Esta respuesta se devuelve siempre de forma opaca. Se devuelve inmediatamente al insertar el job en la cola, sin consultar al `User`, sin generar token, sin llamar a Resend, y sin esperar el delivery de email. La opacidad evita diferenciar: cuenta inexistente, cuenta no elegible, cuenta elegible, o fallo posterior del proveedor de email. Los errores reales de PostgreSQL que rompan la base de datos no se ocultan y provocarán error técnico, pero cualquier validación de negocio se convierte en accepted.
- **429 Too Many Requests:** Si se excede el rate limit.

**Protecciones (Guards y Rate Limits):**
- Protegido por `OriginGuard` para validación de procedencia.
- Protegido por `AuthRateLimitGuard`.
- Límite IP (`FORGOT_PASSWORD_IP`): 3 por 3600 segundos.
- Límite por Email (`FORGOT_PASSWORD_AUTH_EMAIL`): 3 por 3600 segundos.

#### Flujo de Emisión:
1. **Validación DTO:** Validación sintáctica.
2. **Normalización:** Normalización de email.
3. **Queue:** Inserta `PasswordResetRequestJob` en PostgreSQL.
4. **Respuesta Opaca Inmediata:** `{ "accepted": true }`.
5. **Worker (Asíncrono):** Polling con `FOR UPDATE SKIP LOCKED`.
6. **Búsqueda (Asíncrono):** Búsqueda de usuario elegible.
7. **Generación Única:** Token raw generado una sola vez.
8. **Hashing:** SHA-256 persistido.
9. **Invalidación:** Invalidación de tokens previos.
10. **Seguridad:** Creación de SecurityAuditEvent.
11. **Email Delivery:** Envío de correo.
12. **Idempotencia Email:** Idempotency key basada en `passwordResetTokenId`.

### 1.2 `POST /auth/reset-password`

Endpoint público para consumir un token y restablecer la contraseña.

**Request:**
- Body DTO:
  - `token`: Token Base64URL de 43 caracteres.
  - `newPassword`: newPassword de 15 a 128 caracteres (code points).

**Respuestas:**
- **200 OK:** `{ "completed": true }`
- **400 Bad Request:**
  - `InvalidPasswordResetTokenError` genérico se presenta de forma opaca para los estados: inexistente, expirado, consumido, invalidado.
  - `PasswordPolicyError` con su mensaje específico.
- **429 Too Many Requests:** Si se excede el rate limit.

**Protecciones:**
- Protegido por `OriginGuard` para validación de procedencia.
- Protegido por `AuthRateLimitGuard`.
- Límite IP (`RESET_PASSWORD_IP`): 5 por 900 segundos.
- No inicia sesión automáticamente.

#### Flujo de Consumo:
1. **Validación Sintáctica:** Validación sintáctica del token y longitud de password en code points.
2. **SHA-256.**
3. **Búsqueda de Token Pendiente.**
4. **Hash Argon2id:** Hash Argon2id de la nueva contraseña.
5. **Transacción.**
6. **Actualización Condicional Atómica:** `updateMany` condicional. Consumo atómico dentro de la transacción.
7. **Count exactamente 1.**
8. **Actualización de passwordHash.**
9. **Revocación Total de Sesiones:** `SessionService.revokeAllSessions` las revoca dentro de la misma transacción de consumo, con razón `PASSWORD_RESET`. Los registros de sesión no se eliminan físicamente, sino que se conservan revocados.
10. **Seguridad:** `SecurityAuditEvent`. No se crea una sesión nueva.

## 2. Password Reset Request Queue

El procesamiento del restablecimiento se realiza mediante una cola durable en PostgreSQL:

- Entidad: `PasswordResetRequestJob`.
- Estados: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- Mecanismo: Queue durable en PostgreSQL, worker interno en NestJS, polling con `FOR UPDATE SKIP LOCKED`.
- Resiliencia: Uso de lease, lockToken, fencing, y máximo 5 attempts.
- Backoff: 1 min, 5 min, 15 min, 1 hora.
- Limpieza: Terminal purge tras 24h.

No se utiliza Redis ni RabbitMQ; la cola es enteramente implementada sobre PostgreSQL.

## 3. Token Delivery Security

- El raw token nunca se almacena en texto plano at rest.
- Durante retries de email existe una representación reversible cifrada en el payload del job.
- El cifrado utiliza `AES-256-GCM` con AAD contextual ligado al `jobId` y `passwordResetTokenId`. Ciphertext swapping falla de forma segura.
- El material reversible se elimina/redacta en `COMPLETED` o `FAILED`.
- El token ID puede mantenerse hasta el purge.
- Email delivery es at-least-once. effectively-once depende de la idempotency key del provider.

## 4. Encryption Key

`PASSWORD_RESET_QUEUE_ENCRYPTION_KEY`:
- Obligatoria.
- Base64URL canónica de exactamente 32 bytes.
- Sin default o fallback.
- Operacionalmente, rotar la key solo después de drenar jobs activos o conservando compatibilidad con la key anterior. Cambiarla abruptamente impide decrypt de jobs activos.

## 5. Rate Limits y Guards

La clave HMAC conceptual para el storage ahora incorpora: `policyType`, `identitySource`, y `normalizedIdentity`.
El storage recibe únicamente el digest final, nunca los componentes en texto claro.

Valores actuales:
- `FORGOT_PASSWORD_IP` = 3 / 3600
- `FORGOT_PASSWORD_AUTH_EMAIL` = 3 / 3600
- `RESET_PASSWORD_IP` = 5 / 900
- `LOGIN_IP` = 20 / 900
- `LOGIN_AUTH_EMAIL` = 5 / 3600
- `REGISTER_IP` = 5 / 3600
- `RESEND_VERIFICATION_USER` = 3 / 3600
- `VERIFY_EMAIL_IP` = 10 / 900

Limitación técnica actual: el storage es in-memory y por tanto apropiado para modelo single-process. Un restart limpia los buckets. Varias réplicas dividen los límites. Antes de escalar horizontalmente, deberá migrarse a un storage distribuido. No se implementa Redis todavía.

## 6. Email Delivery

- La idempotency key es `password-reset/{passwordResetTokenId}`, sin token ni email.
- URL: `/reset-password#token=<token_encoded>`.
- Token raw únicamente dentro del enlace del cuerpo.
- No hay logs de token o URL.
