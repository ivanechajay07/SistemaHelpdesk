# Auditoría de seguridad — HelpDesk PRO

Fecha: 2026-11-20
Alcance: backend Spring Boot (`backend/`), frontend React (`frontend/`), configuración Docker, CI y secretos locales.
Método: revisión estática de código/ configuración + pruebas HTTP contra la instancia local aislada (`helpdesk-local`, puerto 8089).

> Este documento lista **lo que falta implementar o corregir**. Al final incluye lo que ya está
> correctamente resuelto para no rehacerlo.

---

## 1. Resumen ejecutivo

La base de seguridad es mejor que la de un proyecto típico: contraseñas con BCrypt, JWT firmado con
expiración, bloqueo por intentos fallidos, rate limiting en login, 2FA TOTP con secreto cifrado,
modelo de roles/permisos con `@PreAuthorize`, validaciones de propiedad en tickets/chat/actas,
WebSocket autenticado con autorización por tópico, adjuntos con URL firmada y protección de path
traversal, consultas JPA parametrizadas y correos con escape HTML.

Sin embargo, **no está listo para producción** por brechas en: gestión de sesiones, fuerza bruta de
2FA, exposición de servicios de infraestructura, cabeceras/TLS, escalada de privilegios vía gestión
de usuarios, SSRF en monitoreo y ciclo de vida de dependencias.

### Conteo de hallazgos

| Severidad | Cantidad |
|---|---|
| Crítica | 4 |
| Alta | 6 |
| Media | 12 |
| Baja | 8 |

---

## 1.1. Estado de implementación (2026-11-20)

Se aplicó la Fase 1 completa y el núcleo de la Fase 2. Los hallazgos de las secciones 2–5 se
conservan como referencia histórica; esta tabla indica qué está corregido en el código actual.

| ID | Estado | Cambio aplicado |
|---|---|---|
| C-1 | ✅ Corregido (código) | MySQL, phpMyAdmin, Mailpit y API publicados solo en `127.0.0.1`; `PMA_ARBITRARY` eliminado; usuario MySQL de aplicación (`DB_APP_USER`) en lugar de root; Mailpit ya no expone correos a la LAN |
| C-2 | ✅ Corregido salvo rotación de Gmail | `ADMIN_PASSWORD` obligatoria con fail-fast (`ALLOW_DEFAULT_ADMIN_PASSWORD=false`); `JWT_SECRET` rotado; contraseña del admin local alineada a `ADMIN_PASSWORD`. **Pendiente:** rotar la App Password de Gmail (acción manual en la cuenta) |
| C-3 | ✅ Núcleo corregido | Refresh tokens opacos con hash en BD, rotación, detección de reuso (revoca familia + `tokenVersion`), `POST /auth/logout`, access token de 30 min, frontend guarda el refresh rotado, revocación en cambio/reset de contraseña, bloqueo y desactivación. **Pendiente:** cookies `HttpOnly`, timeout de inactividad y listado de sesiones |
| C-4 | ✅ Corregido | Rate limit en `2fa/verify`, `forgot-password`, `reset-password`, `register` y `refresh`; protección anti-replay de TOTP (`two_factor_last_step`); lockout también revoca refresh tokens |
| A-1 | ✅ Corregido | Solo ADMIN asigna el rol ADMIN, modifica usuarios ADMIN o cambia contraseñas de terceros |
| A-2 | ✅ Corregido | Swagger deshabilitado por defecto; verificado 401 sin token y 403 con token |
| A-3 | ✅ Corregido | Solo login, register, refresh, logout, forgot/reset y 2fa/verify son públicos; verificado 401 en `/auth/me` y `/auth/heartbeat` |
| A-4 | ✅ Corregido | Sin redirecciones HTTP, bloqueo de link-local/metadatos/IPv6 ULA y mutaciones de monitoreo solo ADMIN |
| A-5 | ✅ Corregido | WebSocket valida firma, expiración, cuenta y `tokenVersion` |
| A-6 | ✅ Corregido | `ROLE_MANAGE` no puede tocar su propio rol ni otorgar permisos que no posee |
| M-2 | ✅ Corregido | `DataAccessException` y mensajes técnicos ya no se filtran al cliente |
| M-5 | ✅ Corregido | Cambiar correo exige contraseña actual (backend + formulario de Settings) |
| M-13 | ✅ Corregido | CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `server_tokens off` y Nginx sin privilegios |
| M-14 | ✅ Parcial | Backend uid 10001 y Nginx uid 101, `read_only`, `cap_drop: ALL`, `no-new-privileges`. Pendiente: digests fijos y límites de CPU/memoria |
| M-17 | ✅ Verificado | Actuator responde 401 sin token |
| Bloqueo por intentos | ✅ Corregido | 5 intentos fallidos → 15 min de bloqueo, mensaje con minutos restantes y respuesta 423; parámetros `MAX_LOGIN_ATTEMPTS` / `LOCK_MINUTES` |
| Tests | ✅ Añadidos | 67 tests backend (JUnit/Mockito/ArchUnit) + 14 tests frontend (Vitest/jsdom); CI ejecuta ambos |
| Arquitectura | ✅ Verificada | Controladores sin acceso a repositorios/entidades; reglas ArchUnit en CI y guía en `docs/ARQUITECTURA.md` |
| Suministro | ✅ Parcial | Spring Boot actualizado a **3.5.16**; CI con Trivy + `npm audit` informativo. Pendiente: gate bloqueante y evaluar el salto mayor a 4.x |

### Correcciones adicionales detectadas durante la implementación

- **`@Modifying(clearAutomatically = true)` descartaba cambios pendientes** antes del flush:
  el cambio/restablecimiento de contraseña, el `tokenVersion` y el bloqueo por intentos no se
  persistían. Se eliminó `clearAutomatically` y se usa `saveAndFlush` en las rutas críticas.
- **`DataSeeder` fallaba al reiniciar** (`Duplicate entry` en `usuario_roles`) porque reemplazaba
  la colección de roles con `Set.of(...)`. Ahora solo añade el rol si falta.

### Verificación realizada contra la instancia aislada

| Prueba | Resultado |
|---|---|
| `/auth/me`, `/auth/heartbeat`, `/actuator/health` sin token | 401 |
| `/v3/api-docs` sin token / con token | 401 / 403 |
| Login con `ADMIN_PASSWORD` / con `admin123` | OK / rechazado |
| Refresh token: rotación | Nuevo token distinto |
| Reutilización de refresh token | 401 y familia revocada (el token rotado también deja de servir) |
| Logout + refresh posterior | 200 + 401 |
| Contenedores backend/frontend | `uid=10001(app)` / `uid=101(nginx)` |
| MySQL | publicado solo en `127.0.0.1:3312` |
| Cabeceras del frontend | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy presentes |
| Suite de tests del backend | 19 pruebas, 0 fallos (`mvn test`) |
| Cambio de contraseña | Persistido en BD, `tokenVersion` incrementado y sesiones previas revocadas |
| 5 intentos fallidos | Bloqueo 15 min (`locked_until`) y 6.º intento → 423 con "14 minuto(s)" restantes |
| Sesión inactiva 20 min | `GET /auth/me` → 401; al restaurar actividad → 200 |
| Tests backend / frontend | 67 / 14, sin fallos |

### Pendiente para las siguientes fases

1. Rotar la App Password de Gmail expuesta y revisar el historial de secretos.
2. Evaluar la migración mayor a Spring Boot 4.x y convertir Trivy en gate bloqueante.
3. Subidas: TTL/limpieza de huérfanos y ClamAV activo en producción (magic bytes, dimensiones y cuotas ya implementados).
4. Cookies `HttpOnly` + CSRF y listado/gestión de sesiones (el timeout por inactividad ya está).
5. Límites de tamaño e integridad (hash) en actas y evidencias; auditoría de revelación de secretos.
6. TLS de extremo a extremo y `useSSL=true` si la BD deja de ser local.
7. Política de contraseñas 12+ con verificación de filtraciones (HIBP).
8. Pruebas automatizadas de autorización (IDOR/escalada) en CI.

---

## 2. Hallazgos críticos

### C-1. MySQL y phpMyAdmin expuestos a la red con `root/root`

`docker-compose.yml:10-11, 62-75`

```yaml
mysql:
  ports: ["${DB_PORT:-3306}:3306"]      # 0.0.0.0:3306
phpmyadmin:
  PMA_ARBITRARY: "1"                    # permite conectarse a cualquier host
  ports: ["${PMA_PORT:-8083}:80"]       # 0.0.0.0:8083
```

- `DB_USERNAME`/`DB_PASSWORD` por defecto son `root/root` (`.env`, `.env.example`).
- Cualquier equipo de la red puede conectarse a MySQL como root.
- phpMyAdmin sin autenticación propia, con `PMA_ARBITRARY=1`, permite atacar otros MySQL internos.
- Mailpit (base) también publica `8025/1025` en `0.0.0.0` sin autenticación: cualquiera en la red
  puede **leer todos los correos** generados por el sistema (`docker-compose.yml:20-26`).

**Implementar:** bind a `127.0.0.1` por defecto (`127.0.0.1:${DB_PORT:-3306}:3306`), usuario MySQL
dedicado con permisos mínimos (no root), contraseñas fuertes obligatorias (sin defaults), quitar
`PMA_ARBITRARY`, no publicar Mailpit fuera del host, y red interna separada para base de datos.

---

### C-2. Credenciales por defecto y secreto real en `.env`

- `DataSeeder.java:36-37` crea `admin/admin123` si no se define `ADMIN_PASSWORD`.
- `README.md:45-50` y `.env.example:36` documentan esa contraseña.
- `.env` local contiene una **App Password real de Gmail** (`MAIL_PASSWORD`) y el `JWT_SECRET`.
  El `.env` no está versionado (correcto), pero la contraseña fue expuesta en texto plano durante
  esta sesión y en el propio repo de trabajo.

**Implementar:**
1. Rotar de inmediato la App Password de Gmail y el `JWT_SECRET`.
2. Eliminar el default `admin123`: el backend debe **fallar al arrancar** si `ADMIN_PASSWORD` no
   está definida o no cumple la política (fail-fast, igual que `JwtService.validateSecret`).
3. Forzar cambio de contraseña en el primer inicio de sesión (`mustChangePassword`).
4. Nunca imprimir/aceptar credenciales por defecto en entornos no locales.

---

### C-3. Sesiones: tokens en `localStorage`, sin logout real ni rotación efectiva

- `frontend/src/lib/axios.ts:14,29,37` y `frontend/src/store/authStore.ts:46-82` guardan
  `access_token` y `refresh_token` en `localStorage` (accesibles a cualquier XSS).
- Access token de 24 h (`JWT_EXPIRATION=86400000`) y refresh de 7 días (`app.jwt.refresh-expiration`).
- El backend rota el refresh token (`AuthService.java:250-252`), pero el frontend **solo guarda el
  nuevo access token** (`axios.ts:37`), así que el refresh original sigue vigente 7 días: la
  rotación es inútil.
- No existe `POST /auth/logout`: cerrar sesión solo borra el `localStorage`; el token robado
  sigue siendo válido hasta expirar.
- No hay lista de sesiones/dispositivos, ni timeout por inactividad, ni revocación por `jti`.

**Implementar:** refresh tokens con estado en servidor (tabla `refresh_tokens` con familia, hash,
rotación y detección de reuso), endpoint de logout que revoque el refresh y (opcional)
`denylist` de access tokens, expiración corta (15–30 min) para access, timeout por inactividad,
y migrar a cookies `HttpOnly; Secure; SameSite=Strict` (con CSRF token) o, como mínimo, CSP estricta.

---

### C-4. 2FA vulnerable a fuerza bruta y reutilización

`AuthService.java:166-192`, `TotpService.java:38-58`

- `/api/v1/auth/2fa/verify` **no tiene rate limiting** ni bloqueo de cuenta: con la contraseña
  comprometida, el atacante tiene 5 minutos (vida del `mfaToken`) para probar códigos de 6 dígitos
  sin límite.
- `TotpService.verificar` acepta ±1 ventana (±30 s) y **no registra códigos ya usados**: un código
  interceptado puede reutilizarse hasta ~90 s.
- `/auth/forgot-password` y `/auth/reset-password` tampoco tienen rate limiting
  (`RateLimiterService` solo se usa en login y registro: `AuthService.java:73,75,309`).

**Implementar:** rate limit por usuario+IP en `2fa/verify` (p. ej. 5 intentos / 5 min, con bloqueo),
registro del último `timeStep` usado por usuario, rate limit y CAPTCHA en forgot-password,
límite de tokens de reset por usuario/hora, y alertas por intentos fallidos de MFA.

---

## 3. Hallazgos altos

### A-1. Escalada de privilegios a través de la gestión de usuarios

`UserController.java:96-108`, `UserService.java:80-168`

`PUT /api/v1/users/{id}` solo exige `USER_MANAGE` o `ROLE_ADMIN`. Un usuario con `USER_MANAGE`
(permiso delegable desde "Roles y Permisos") puede:

- Editar **su propio** usuario y asignarse `roleIds=[<ADMIN>]` (no hay restricción de auto-escalada
  ni de asignación del rol ADMIN).
- Cambiar la contraseña de **cualquier** usuario, incluido el administrador, sin conocer la actual.

**Implementar:** solo `ROLE_ADMIN` puede asignar/quitar el rol `ADMIN` y editar usuarios ADMIN;
prohibir que un usuario se auto-asigne roles; separar el cambio de contraseña de terceros
(endpoint administrativo con auditoría y notificación); validar que `roleIds` no incluya roles
de mayor privilegio que el del actor.

### A-2. Swagger/OpenAPI público

Verificado: `GET /v3/api-docs` → **200** sin autenticación (`SWAGGER_ENABLED=true` en `.env`).
`SecurityConfig.java:89-101` permite `/v3/api-docs/**`, `/swagger-ui/**`, etc.

**Implementar:** `SWAGGER_ENABLED=false` por defecto en producción, proteger Swagger con
autenticación/rol ADMIN o desplegarlo solo en un perfil de desarrollo. Documentar el cambio en
`.env.example`.

### A-3. `/api/v1/auth/**` completamente público

`SecurityConfig.java:78-88`

Todo el prefijo queda `permitAll`; la protección real depende de `@PreAuthorize` o de que el
servicio falle. Verificado:

- `POST /api/v1/auth/heartbeat` → **200 `{"message":"ok"}`** sin token.
- `GET /api/v1/auth/me` → **400 `{"message":"Usuario no encontrado"}`** sin token (llega al servicio
  y filtra un mensaje interno).

`/auth/change-password`, `/auth/2fa/setup`, etc. están alcanzables sin autenticar (fallan por
lógica de negocio, no por el filtro).

**Implementar:** permitir solo `POST /auth/login`, `/auth/register`, `/auth/refresh`,
`/auth/forgot-password`, `/auth/reset-password`, `/auth/2fa/verify`; el resto debe exigir
autenticación en el filter chain (no solo en el servicio).

### A-4. SSRF en monitoreo (bypass por redirecciones) y escaneo de red interna

`TargetCheckService.java:235-334`, `MonitoringController.java:21`

- `probeHttp` sigue redirecciones (`HttpClient.Redirect.NORMAL`) pero solo valida la URL inicial:
  un destino que responda `302 → http://169.254.169.254/...` o a la red interna **no se revalida**.
- Los tipos `TCP` y `PING` permiten escanear cualquier host/puerto interno.
- El acceso está concedido a cualquier usuario con `MONITORING_VIEW` (no solo ADMIN).
- `allow-private-targets` es `true` por defecto.

**Implementar:** deshabilitar redirecciones (o revalidar cada salto y el host resuelto), resolver y
validar IP en cada petición (anti DNS-rebinding), bloquear rangos de metadatos (`169.254.0.0/16`,
`fd00:ec2::254`, etc.), limitar creación/edición de objetivos a `ROLE_ADMIN`, y separar la función
de "monitoreo" de la de "escaneo de puertos".

### A-5. WebSocket acepta tokens revocados

`WebSocketAuthChannelInterceptor.java:55-80`

El `CONNECT` STOMP solo valida firma/expiración y `isActivo`; **no llama a `JwtService.isTokenValid`**,
así que un token invalidado por cambio de contraseña (`tokenVersion`) o por bloqueo sigue abriendo
conexiones y recibiendo mensajes en tiempo real.

**Implementar:** reutilizar la validación completa (usuario, `tv`, `enabled`, `accountNonLocked`)
antes de asociar el `Principal`.

### A-6. Escalada por rol con `ROLE_MANAGE` (permisos completos sin ser admin)

`RoleService.java:52-69`

Un usuario no-admin con `ROLE_MANAGE` puede editar los permisos de su propio rol (p. ej.
`SUPERVISOR`) y otorgarse `USER_MANAGE`, `TICKET_VIEW_ALL`, `INV_*`, `MONITORING_VIEW`, etc. Solo
se protege el rol `ADMIN`. Combinado con A-1 permite escalar a ADMIN.

**Implementar:** solo ADMIN puede modificar permisos de roles; o impedir que un actor otorgue
permisos que él mismo no posee, y nunca permitir auto-modificación de su propio rol.

---

## 4. Hallazgos medios

| ID | Hallazgo | Evidencia | Qué implementar |
|---|---|---|---|
| M-1 | ✅ Corregido (núcleo) | Magic bytes, validación de dimensiones, cuota 30 archivos/hora, límites multipart, validación de firmas/fotos y ClamAV opcional (`CLAMAV_HOST`). Pendiente: TTL/limpieza de huérfanos y antivirus activo en producción |
| M-2 | El manejador global devuelve `ex.getMessage()` de cualquier `RuntimeException`, incluidas las de Spring DAO (SQL/constraint) | `GlobalExceptionHandler.java:65-73` | Mapear excepciones de persistencia a mensajes genéricos; solo exponer mensajes de excepciones de negocio propias |
| M-3 | Enumeración de usuarios: `GET /users/role/{roleName}` accesible a cualquier autenticado; avatar público con IDs secuenciales (200/404) | `UserController.java:40-44, 65-74` | Restringir a staff; devolver 404 uniforme; usar identificadores no secuenciales para avatares públicos |
| M-4 | Métricas globales de tickets expuestas a CLIENTE | `DashboardController.java` (`/stats`, `/chart`) | Exigir `REPORT_VIEW`/`TICKET_VIEW_ALL`/ADMIN o filtrar por usuario |
| M-5 | Cambio de email sin confirmación de contraseña ni verificación de propiedad | `UserService.java:171-191` | Exigir contraseña actual, enviar enlace de verificación al nuevo correo y no cambiarlo hasta confirmarlo |
| M-6 | Enumeración por tiempo en forgot-password (envío SMTP síncrono vs. retorno inmediato) y sin CAPTCHA | `AuthService.java:343-380`, `EmailService.java:311-318` | Enviar siempre asíncrono, responder en tiempo constante y añadir CAPTCHA/rate limit |
| M-7 | Rate limiting eludible: en memoria (se pierde al reiniciar y no sirve multi-instancia) y confía en `X-Forwarded-For` de cualquier IP privada | `RateLimiterService.java`, `DeviceInfoResolver.java:105-134`, `AuthService.java:75` | Usar Redis/Bucket4j y confiar en proxy solo desde una lista explícita de IPs |
| M-8 | Replay de TOTP y activación de 2FA no invalida sesiones existentes | `TotpService.java:38-58`, `AuthService.java:136-150` | Registrar `timeStep` usado y revocar sesiones al activar/desactivar 2FA |
| M-9 | Directorio de correo corporativo: ADMIN puede revelar contraseñas en claro sin auditoría; sal PBKDF2 fija | `CorreoController.java:65-75`, `CorreoService.java:71-78`, `CryptoService.java:32-33` | Auditar cada revelación, exigir re-autenticación/2FA, usar sal aleatoria por registro y rotación de clave |
| M-10 | Integridad de actas: firmas/fotos sin límite de tamaño ni hash; contenido alterable en BD sin evidencia | `ActaRequest.java` (`fotoData`, `firma*` sin `@Size`), `ActaService.java:70-81` | `@Size` máximo, guardar hash SHA-256 del acta, sellado de tiempo y bloqueo de edición |
| M-11 | Evidencias de tareas: hasta 8 MB base64 por registro y sin límite de cantidad → DoS de almacenamiento | `TaskEvidenceRequest.java:16`, `TaskEvidenceService.java:39-56` | Limitar cantidad por tarea y tamaño total, mover a almacenamiento de archivos con cuota |
| M-12 | ✅ Corregido | Cierre por inactividad (15 min por defecto) en frontend (`useIdleLogout`) y validación en backend (filtro JWT + refresh); configurable con `IDLE_TIMEOUT_MINUTES` / `VITE_IDLE_TIMEOUT_MINUTES`. Pendiente: cookies `HttpOnly` y listado de sesiones |
| M-13 | Faltan cabeceras de seguridad y TLS; nginx revela versión | `frontend/nginx.conf` | HSTS, CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `server_tokens off`, TLS con redirección |
| M-14 | Contenedores como root, sin `read_only`, `cap_drop`, límites ni digest fijo; uploads sin cifrar | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` | Usuario no-root, filesystem de solo lectura + tmpfs, `cap_drop: [ALL]`, límites de CPU/memoria, imágenes por digest |
| M-15 | Política de contraseñas débil para producción (8 caracteres), sin historial ni verificación de filtraciones | `RegisterRequest.java`, `UserRequest.java` | Mínimo 12–14, lista de contraseñas comprometidas (HIBP k-anonymity), historial y caducidad opcional para admin |
| M-16 | Auditoría incompleta: no registra revelación de secretos, 403 ni accesos denegados; sin protección de integridad | `AuditService`, `CorreoService` | Registrar accesos a secretos y denegaciones; tabla append-only/hash-chain y retención |
| M-17 | `spring-boot-starter-actuator` incluido sin configuración explícita | `backend/pom.xml` | Exponer solo `health` (ya está protegido: 401) o eliminarlo si no se usa |
| M-18 | QR público expone nº de serie, responsable y ubicación física | `ActivoService.java:99-123` | Configurar campos públicos, enmascarar datos personales y limitar tasa de consultas |

---

## 5. Hallazgos bajos

1. `/auth/heartbeat` público responde 200 (L-1).
2. El login distingue cuentas desactivadas/bloqueadas antes de validar contraseña (enumeración) (L-2).
3. JWT sin `iss`, `aud` ni `jti`; BCrypt sin parámetro de coste explícito (L-3).
4. `CORS_ALLOWED_ORIGINS=*` en `.env`; aunque se desactivan credenciales, debe fijarse el origen real (L-4).
5. `test-create-user.js` en la raíz con credenciales hardcodeadas (L-5).
6. El frontend cachea `user` (email, roles) e imágenes base64 en `localStorage` (L-6).
7. Respuestas de autenticación sin `Cache-Control: no-store` (L-7).
8. Sin política de backups cifrados ni plan de restauración documentado (L-8).

---

## 6. Cadena de suministro, CI y dependencias

- **Spring Boot** actualizado de 3.2.4 (EOL) a **3.5.16** con springdoc 2.8.17; suite de tests
  completa en verde. Siguiente paso opcional: migración mayor a Boot 4.x (Jackson 3/Security 7).
- No hay escaneo de vulnerabilidades en CI (`.github/workflows/ci.yml` solo compila y ejecuta tests).
  Dependabot está configurado (`.github/dependabot.yml`) pero no bloquea merges inseguros.
- No hay escaneo de secretos (gitleaks) ni SAST (CodeQL/Semgrep).
- Imágenes Docker con etiquetas flotantes (`mysql:8.0`, `phpmyadmin:5.2`, `node:20-alpine`,
  `nginx:1.27-alpine`): fijar por digest y reconstruir periódicamente.
- Solo existen 5 pruebas unitarias (JWT, TOTP, rate limiter, SLA, adjuntos); no hay pruebas de
  autorización/IDOR ni de integración de seguridad.

---

## 7. Lo que ya está bien implementado (no rehacer)

- BCrypt para contraseñas y `JwtService` con validación de longitud mínima del secreto (fail-fast).
- JWT con expiración, `tokenVersion` para revocar sesiones tras cambio/restablecimiento de contraseña,
  y verificación de cuenta activa/bloqueada en cada petición.
- Bloqueo temporal tras 5 intentos fallidos y rate limiting en login (por usuario y por IP) y registro.
- Reset de contraseña con token aleatorio, **hash SHA-256 en BD**, un solo uso, expiración de 24 h y
  mensajes genéricos para no enumerar cuentas.
- 2FA TOTP (RFC 6238) con secreto cifrado AES-GCM y URL `otpauth` correcta.
- Modelo de permisos fino con `@PreAuthorize` en la mayoría de controladores y validaciones de
  propiedad en tickets, chat, actas y evidencias (sin IDOR evidente en tickets/chat).
- WebSocket con autenticación en `CONNECT` y autorización de suscripciones por tópico/participante.
- Adjuntos de chat con URL firmada HMAC + expiración, `Content-Disposition` y comprobación de
  path traversal; uploads de avatar/chat con saneado de nombre.
- Consultas JPA parametrizadas (sin concatenación SQL) y validación `@Valid` en los DTO principales.
- Correos con escape HTML de los datos interpolados.
- CORS con bloqueo de credenciales cuando hay `*`.
- Flyway con `baseline-on-migrate` y `ddl-auto=validate`.
- Actuator protegido (401) y Swagger desactivable por variable.
- `.env` fuera de Git (solo `.env.example` versionado).

---

## 8. Plan de implementación sugerido

### Fase 1 — Contención (1–2 días)

1. Rotar App Password de Gmail y `JWT_SECRET`; eliminar `admin/admin123`; forzar cambio de contraseña.
2. Bind de MySQL/phpMyAdmin/Mailpit a `127.0.0.1`; crear usuario MySQL dedicado con permisos mínimos.
3. `SWAGGER_ENABLED=false`; restringir `/api/v1/auth/**` a los 6 endpoints públicos reales.
4. Añadir rate limiting a `2fa/verify`, `forgot-password` y `reset-password`.
5. Cabeceras de seguridad en nginx + `server_tokens off`.

### Fase 2 — Sesiones y autorización (3–5 días)

6. Refresh tokens con estado en servidor, rotación real, detección de reuso y `/auth/logout`.
7. Access tokens de 15–30 min + timeout de inactividad; evaluar cookies `HttpOnly`.
8. Bloquear asignación del rol ADMIN y auto-edición de roles; exigir ADMIN para tocar usuarios ADMIN.
9. Solo ADMIN modifica permisos de roles (o regla "no puedes otorgar lo que no tienes").
10. Validación completa del JWT en WebSocket (incluido `tokenVersion`).

### Fase 3 — Endurecimiento (1–2 semanas)

11. SSRF: sin redirecciones, revalidación de IP, rangos de metadatos bloqueados, monitoreo solo ADMIN.
12. Uploads: magic bytes, antivirus, cuotas, TTL y asociación a ticket.
13. Excepción global sin filtrar mensajes de persistencia; auditoría de secretos y 403.
14. Contenedores no-root, `read_only`, `cap_drop`, límites y digests; TLS en el frontend.
15. Actualizar Spring Boot a versión soportada; añadir Trivy/OWASP/npm audit/gitleaks/CodeQL a CI.
16. Pruebas de autorización (IDOR/escalada) en CI y `SECURITY.md` con canal de reporte.

---

## 9. Evidencia de pruebas realizadas

Contra `http://localhost:8089` (instancia aislada):

| Petición | Resultado |
|---|---|
| `GET /api/v1/auth/me` sin token | 400 `{"message":"Usuario no encontrado"}` |
| `POST /api/v1/auth/heartbeat` sin token | **200** `{"message":"ok"}` |
| `GET /v3/api-docs` sin token | **200** (Swagger público) |
| `GET /actuator/health` sin token | 401 (correcto) |
| `GET /api/v1/users/1/avatar` sin token | 404 (público por diseño) |
| `GET /api/v1/chat/attachments/x?exp=...&sig=00` | 403 (firma validada, correcto) |

> Nota: las pruebas se hicieron solo contra la instancia local; no se modificaron datos ni los
> contenedores de otros proyectos.
