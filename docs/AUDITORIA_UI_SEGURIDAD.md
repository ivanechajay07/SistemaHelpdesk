# Auditoría de seguridad y experiencia — HelpDesk PRO

Fecha: 2026-11-20  
Alcance: backend Spring Boot, frontend React, Docker, CI y repositorio.  
Método: revisión estática de código/ configuración, inventario de dependencias y build local. No incluye pentest dinámico ni pruebas de carga.

---

## 1. Resumen ejecutivo

La base es sólida: autenticación con bloqueo y rate limiting, refresh tokens rotativos con detección de reuso, 2FA con anti-replay, adjuntos firmados, validación de archivos por magic bytes, contenedores sin privilegios, CSP/HSTS, Swagger desactivado, 67 pruebas backend con ArchUnit y 14 pruebas frontend.

Los riesgos principales ya no están en la autenticación básica, sino en:

1. **Dependencias de producción vulnerables** (`axios`, `dompurify`, `follow-redirects`).
2. **Tokens en `localStorage`**, expuestos ante cualquier XSS.
3. **Controles de CI informativos** (Trivy y `npm audit` no bloquean).
4. **Configuración de producción incompleta**: phpMyAdmin/Mailpit en el compose base, contraseñas de BD por defecto, sin TLS ni backups.
5. **Archivos subidos versionados en Git** y un script con credenciales de prueba.
6. **Accesibilidad e interacción aún parciales**: 48 gráficos sin alternativa textual, menús de acciones sin teclado, tipografía Inter no cargada y locale mixto.

### Conteo orientativo

| Área | Alta | Media | Baja |
|---|---:|---:|---:|
| Seguridad / DevOps | 6 | 7 | 4 |
| Diseño / UX / accesibilidad | 3 | 6 | 4 |

---

## 2. Seguridad y DevOps

### S-1. Dependencias de producción con vulnerabilidades altas — **Alta**

Evidencia (`npm audit --omit=dev`):

- `axios@1.19.0` — múltiples avisos, incluidos prototype pollution y redirecciones.
- `dompurify@3.4.14` — avisos de XSS (transitiva de `jspdf`).
- `follow-redirects@1.16.0` — bypass de credenciales en redirecciones.

Impacto: superficies de XSS/SSRF y comportamiento inesperado de red. Aunque `dompurify` no se usa directamente para renderizar HTML, sigue formando parte del árbol instalado.

Acción: ejecutar `npm audit fix`, fijar versiones parcheadas y volver a ejecutar build/tests. Añadir `npm audit --omit=dev --audit-level=high` como gate bloqueante.

### S-2. Tokens en `localStorage` — **Alta**

Evidencia: `frontend/src/store/authStore.ts` y `frontend/src/lib/axios.ts` guardan `access_token` y `refresh_token` en `localStorage`.

Impacto: cualquier XSS puede exfiltrar ambos tokens; el refresh token permite mantener la sesión.

Acción: migrar a cookies `HttpOnly; Secure; SameSite=Strict` emitidas por el backend, con protección CSRF (double-submit o token sincronizado) y limpieza de localStorage. Mientras tanto, mantener CSP estricta y revisar cualquier renderizado de HTML.

### S-3. Archivos subidos versionados en Git — **Alta**

Evidencia: `git ls-files uploads` devuelve 3 imágenes (`image-removebg-preview`, `carro.png`). `uploads/` no está en `.gitignore`.

Impacto: posibles adjuntos de usuarios o material interno en el historial del repositorio; no se pueden “despublicar” con un simple borrado.

Acción: añadir `uploads/` a `.gitignore`, eliminar los archivos del índice y del historial si son sensibles, y rotar cualquier dato expuesto. Mantener solo `uploads/.gitkeep`.

### S-4. Script con credenciales de prueba — **Media**

Evidencia: `test-create-user.js` contiene `admin123` y `testpassword` hardcodeados.

Acción: eliminar el script del repositorio o moverlo a `scripts/dev/` leyendo credenciales de variables de entorno. Nunca incluir contraseñas reales.

### S-5. CI no bloqueante — **Alta**

Evidencia: `.github/workflows/ci.yml` usa Trivy con `exit-code: '0'` y `npm audit ... || true`.

Impacto: se pueden fusionar cambios con vulnerabilidades altas sin que el pipeline falle.

Acción:

- Trivy con `exit-code: '1'` para HIGH/CRITICAL.
- `npm audit --omit=dev --audit-level=high` sin `|| true`.
- Añadir SAST (CodeQL o Semgrep), escaneo de secretos (gitleaks/TruffleHog) y SBOM.
- Escanear también las imágenes Docker, no solo el filesystem.

### S-6. Compose de producción con servicios de desarrollo — **Alta**

Evidencia: `docker-compose.yml` incluye `phpmyadmin` y `mailpit`; ambos quedan publicados en `127.0.0.1`. Los valores por defecto de BD son `helpdesk_dev` y `root` si faltan variables.

Impacto: superficie extra, credenciales débiles y correos de restablecimiento visibles en el host.

Acción:

- Mover `phpmyadmin` y `mailpit` a un archivo `docker-compose.dev.yml` o a `profiles: [dev]`.
- Exigir `DB_ROOT_PASSWORD` y `DB_APP_PASSWORD` con `:?` en producción.
- Separar `docker-compose.yml` (producción) de `docker-compose.local.yml` (desarrollo).

### S-7. Sin TLS ni SSL de base de datos — **Media**

Evidencia: `application.yml` usa `useSSL=false&allowPublicKeyRetrieval=true`; Nginx sirve HTTP; HSTS solo tiene efecto sobre HTTPS.

Acción: terminar TLS en un proxy/ingress, redirigir 80→443, activar `useSSL=true` si la BD deja de ser local y validar el certificado. Añadir `Strict-Transport-Security` solo en respuestas HTTPS.

### S-8. Rate limiting y bloqueo en memoria — **Media**

Evidencia: `RateLimiterService` usa `ConcurrentHashMap` local.

Impacto: con más de una instancia, cada réplica lleva su propio contador; un atacante puede distribuir intentos.

Acción: mover el rate limit y el lockout a Redis (o a la base de datos con bloqueo optimista) para despliegues multi-instancia. Mantener el contador local como primera línea.

### S-9. Sesiones y 2FA incompletos — **Media**

Evidencia: no hay listado/revocación de sesiones por dispositivo; 2FA es opcional y no hay códigos de recuperación.

Acción:

- Pantalla “Sesiones activas” con IP, dispositivo, último uso y botón “Cerrar todas”.
- Exigir 2FA a ADMIN/SUPERVISOR.
- Generar códigos de recuperación de un solo uso, hasheados.
- Añadir “recordar este dispositivo” con token separado y caducidad.

### S-10. Ciclo de vida de archivos — **Media**

Evidencia: validación por magic bytes y dimensiones implementada; ClamAV es opcional y por defecto `fail-closed=false`; no hay TTL ni limpieza de huérfanos.

Acción: limpieza programada de adjuntos sin referencia, cuotas por usuario/ticket, hash SHA-256 para integridad, ClamAV obligatorio en producción y límites también para actas/evidencias.

### S-11. Configuración JPA y pool — **Media**

Evidencia: `spring.jpa.open-in-view` no está definido (default `true`); no hay configuración explícita de Hikari ni timeouts de consulta.

Acción: `open-in-view: false`, pool dimensionado, `connection-timeout`, `validation-timeout` y revisión de N+1 en listados.

### S-12. Sin backups, retención ni alertas — **Media**

Evidencia: no hay política de respaldo de MySQL/uploads ni retención del log de auditoría; no hay alertas de bloqueos, fallos de login o cambios de rol.

Acción: backups automáticos con prueba de restauración, retención definida (p. ej. 90 días), exportación/anonimización y alertas a partir de eventos de auditoría.

### S-13. Cabeceras y CSP mejorables — **Baja**

Evidencia: `style-src 'unsafe-inline'` y `connect-src 'self' ws: wss:` en `frontend/security-headers.conf`.

Acción: valorar nonces/hashes para estilos, restringir `connect-src` al host WebSocket real y añadir `Cross-Origin-Resource-Policy`. Revisar `server.error.include-message: on_param`.

### S-14. Cadena de suministro Docker — **Baja**

Evidencia: imágenes base sin digest (`node:20-alpine`, `eclipse-temurin:21-jre-jammy`, `nginxinc/nginx-unprivileged:1.27-alpine`), `npm ci || npm install`, `mvn dependency:go-offline || true`, backend sin `.dockerignore` y sin Maven Wrapper.

Acción: fijar digests, eliminar fallbacks silenciosos, añadir `backend/.dockerignore`, `mvnw`, healthchecks y límites de CPU/memoria. Escanear imágenes en CI.

### S-15. Pruebas de autorización insuficientes — **Media**

Evidencia: hay pruebas unitarias y ArchUnit, pero no hay pruebas de integración con Testcontainers ni E2E de autorización/IDOR.

Acción: pruebas E2E (Playwright) y de integración para:

- Acceso a tickets/actas/adjuntos de otro usuario.
- Escalada de rol y cambios de contraseña de terceros.
- Rate limit y lockout con múltiples instancias.
- Flujos 2FA completos.

### S-16. Observabilidad — **Media**

Evidencia: logs básicos, sin request-id, métricas, trazas ni error tracking.

Acción: logs estructurados con `traceId`, métricas de latencia/errores, Sentry/OpenTelemetry y dashboards de login, lockouts y colas de correo.

---

## 3. Diseño, accesibilidad e interactividad

### D-1. Alternativa textual de gráficos — **Alta**

Evidencia: 48 `ResponsiveContainer` y 0 gráficos con `aria-label`, `role="img"` o tabla resumen.

Impacto: un usuario con lector de pantalla no puede interpretar los datos.

Acción: envolver cada gráfico en `<figure>` con título y resumen `sr-only`, y ofrecer una tabla de datos colapsable. Añadir navegación por teclado o al menos los valores clave en texto.

### D-2. Menús de acciones sin semántica ni teclado — **Alta**

Evidencia: `Categories.tsx`, `Users.tsx` y `Tickets.tsx` usan dropdowns propios sin `role="menu"`, `aria-expanded` ni navegación con flechas. Los menús del header sí lo hacen.

Acción: extraer un `ActionMenu` reutilizable con foco inicial, flechas, Home/End, Escape, retorno de foco y `aria-controls`. Sustituir los tres dropdowns.

### D-3. Botones solo-icono y foco — **Media**

Evidencia: muchas acciones de tabla usan solo `title` (Activos, Mantenimientos, Tickets).

Acción: `aria-label` explícito en todos los botones sin texto visible y `focus-visible` consistente. Auditar con axe.

### D-4. Contraste y modo oscuro — **Media**

Evidencia: no hay pruebas automáticas de contraste ni auditoría AA; badges ámbar/verde claro sobre fondos claros pueden quedar justos.

Acción: ejecutar axe/Pa11y en CI, revisar contraste de badges, textos `slate-400` y estados hover/focus en ambos temas. Añadir `prefers-contrast`/`forced-colors`.

### D-5. Tipografía y locale — **Media**

Evidencia: se declara `Inter` pero no se carga ninguna fuente (`index.html` no incluye `@font-face` ni Google Fonts); se mezclan `es-PE` y `es-ES`.

Acción: self-host de Inter (woff2) o usar la pila del sistema de forma intencional. Centralizar `Intl.DateTimeFormat`/`NumberFormat` con un locale único y moneda configurable.

### D-6. Interacciones que faltan para sentirse “producto” — **Media**

- **Acciones masivas** en Tickets, Usuarios e Inventario (selección múltiple, asignar/cerrar/exportar).
- **Vistas guardadas** y filtros persistentes por usuario (hoy parte del estado vive en URL).
- **Command palette con acciones**, no solo búsqueda: “Nuevo ticket”, “Ir a inventario”, “Cambiar tema”.
- **Onboarding**: checklist de primeros pasos y tour contextual.
- **Carga de archivos**: drag & drop, pegar imagen, progreso, miniaturas y lightbox.
- **Actualizaciones optimistas con deshacer** para estado/prioridad/asignación.
- **Edición en línea** en tablas (prioridad, estado, responsable).
- **Centro de notificaciones**: marcar todas como leídas, agrupar y persistir.
- **Dashboard personalizable**: rango de fechas, widgets reordenables, auto-refresh.

### D-7. Móvil — **Media**

Evidencia: hay tab bar móvil y tablas convertidas en tarjetas, pero no se usan `safe-area-inset-*`; los modales siguen siendo diálogos centrados.

Acción: respetar notch/barra inferior, convertir modales largos en bottom sheets y revisar objetivos táctiles de 44 px.

### D-8. Rendimiento y bundle — **Media**

Evidencia: `reportExcel` 845 KB, `index` 436 KB, `reportPdf` 421 KB, `ChartTooltip` 332 KB, `html2canvas` 195 KB.

Acción: cargar exportadores solo al pulsar exportar, dividir vendors de Recharts, revisar `manualChunks`, medir LCP/INP y añadir presupuesto de bundle en CI. Servir miniaturas de imágenes en listados.

### D-9. PWA, i18n y documentación visual — **Baja**

- Sin manifest/service worker: no hay instalación ni modo offline.
- Sin i18n: todo el texto está en español y las fechas están repartidas.
- Sin Storybook ni pruebas visuales: el sistema de diseño no está catalogado.
- Sin Sentry ni analítica de producto: no se detectan errores reales de usuario.

### D-10. Deuda de lint — **Baja**

`npm run lint` termina con 0 errores y más de 20 warnings (`set-state-in-effect`, `Date.now` en render, dependencias faltantes, componentes creados en render). Conviene corregirlos y, más adelante, activar `--deny-warnings` en CI.

---

## 4. Lo que ya está bien

- Bloqueo por intentos, rate limit de login y mensajes 423.
- Refresh tokens opacos, hash en BD, rotación y detección de reuso.
- 2FA TOTP con anti-replay y secreto cifrado AES-GCM.
- Adjuntos con enlace firmado y validación por contenido real.
- Roles/permisos con `@PreAuthorize` y refuerzo en servicios.
- WebSocket autenticado y autorizado por tópico.
- Swagger desactivado por defecto y Actuator protegido.
- Contenedores non-root, `read_only`, `cap_drop`, `no-new-privileges`.
- CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- 67 pruebas backend con ArchUnit; 14 pruebas frontend.
- Sistema visual consistente, modo oscuro, skeletons, toasts, command palette, diálogos con foco atrapado y tablas responsivas.
- Tokens de diseño y paleta única de gráficos ya iniciados.
- Impresión A4 con cabeceras repetidas y sin chrome de la app.

---

## 5. Plan recomendado

### Semana 1 — Riesgos inmediatos

1. `npm audit fix` + verificación de build/tests.
2. Sacar `uploads/` del repositorio y añadir `.gitignore`.
3. Eliminar `test-create-user.js` o parametrizarlo.
4. Hacer bloqueantes Trivy y `npm audit`.
5. Separar phpMyAdmin/Mailpit a perfil de desarrollo y exigir contraseñas de BD.
6. Revisar CSP/`connect-src` y `include-message`.

### Semanas 2–3 — Sesión y producción

1. Cookies `HttpOnly` + CSRF y migración desde `localStorage`.
2. Gestión de sesiones/dispositivos y cierre global.
3. 2FA obligatorio para ADMIN + códigos de recuperación.
4. TLS y `useSSL` para BD remota.
5. Redis para rate limit/lockout multi-instancia.
6. Backups automáticos con restauración probada.

### Semanas 4–6 — Calidad y accesibilidad

1. Tests E2E de autorización/IDOR y flujos 2FA.
2. Cobertura mínima y gates en CI.
3. Axe/Pa11y en CI, contraste AA y alternativa textual de gráficos.
4. `ActionMenu` accesible y `aria-label` en acciones.
5. Carga de Inter y locale unificado.
6. Limpieza de warnings de lint.

### Semanas 7–10 — Interactividad

1. Selección múltiple y acciones masivas.
2. Vistas guardadas y command palette con acciones.
3. Onboarding y checklist inicial.
4. Drag & drop, miniaturas y lightbox de adjuntos.
5. Optimistic UI + undo y edición en línea.
6. Dashboard personalizable y centro de notificaciones completo.

### Largo plazo

- PWA/offline, i18n, Storybook, pruebas visuales.
- Observabilidad completa (Sentry/OpenTelemetry).
- Migración evaluada a Spring Boot 4.x.
- SBOM, firma de imágenes y política de dependencias.

---

## 6. Estado de ejecución

### Semana 1 — completada (2026-11-20)

- [x] `axios`, `dompurify`, `follow-redirects` y `vite` actualizados; `npm audit` sin vulnerabilidades.
- [x] `uploads/` fuera del índice de Git y añadido a `.gitignore` (`uploads/.gitkeep`).
- [x] `test-create-user.js` eliminado; reemplazado por `scripts/dev/create-test-user.mjs` con variables de entorno.
- [x] `.env.example` sin correo personal ni sugerencia de contraseña débil.
- [x] Trivy y `npm audit` ahora bloquean HIGH/CRITICAL.
- [x] Gitleaks y CodeQL añadidos al CI.
- [x] phpMyAdmin y Mailpit movidos al override local; compose base solo MySQL + backend + frontend.
- [x] `DB_ROOT_PASSWORD` y `DB_APP_PASSWORD` obligatorias en el compose base.
- [x] Healthchecks, límites de CPU/memoria, límites de logs y `.dockerignore` backend.
- [x] `include-message: never`, `Cross-Origin-Resource-Policy` y `Cache-Control: no-store` para `/api`.
- [x] Build frontend con Vite 8.3.8, 14 tests frontend y 67 tests backend aprobados; stack local healthy.

### Semanas 2–3 — en progreso (2026-11-21)

- [x] Refresh token en cookie `HttpOnly; SameSite=Strict`; access token solo en memoria.
- [x] Eliminados `access_token` y `refresh_token` de `localStorage`.
- [x] Recuperación de sesión al recargar mediante `/auth/refresh`.
- [x] Política de contraseñas 8–12 con mayúscula, minúscula, número y carácter especial.
- [x] Barra de progreso y checklist en registro, creación de usuarios, cambio y reset.
- [ ] Token CSRF explícito si la cookie se extiende a más endpoints.
- [ ] Listado de sesiones/dispositivos y cierre selectivo (existe “cerrar otras”).
- [ ] 2FA obligatorio para ADMIN y códigos de recuperación.
- [ ] TLS y `useSSL` para MySQL remoto.
- [ ] Redis para rate limit/lockout multi-instancia.
- [ ] Backups automáticos con restauración probada.
- [ ] `open-in-view: false` y tuning de Hikari (con pruebas de integración).
- [ ] Alertas de auditoría para bloqueos, fallos de login y cambios de rol.
