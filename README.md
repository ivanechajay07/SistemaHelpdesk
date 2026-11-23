# HelpDesk PRO

Sistema empresarial de soporte técnico (help desk) con gestión de tickets, chat en tiempo real,
inventario de activos, actas de conformidad, tareas, monitoreo de red, base de conocimiento y auditoría.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Security + JWT, Spring Data JPA, WebSocket (STOMP), MySQL 8 |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, React Router 7, Recharts, jsPDF, SheetJS |
| Infra | Docker Compose (MySQL, Nginx). Mailpit y phpMyAdmin solo en desarrollo |

## Requisitos

- Docker + Docker Compose
- Node.js 20+ (solo para desarrollo local del frontend)
- Java 21 + Maven (solo para desarrollo local del backend)

## Puesta en marcha rápida (Docker)

1. Copia la plantilla de entorno y configura tus variables:

   ```bash
   cp .env.example .env
   ```

   ⚠️ **Importante:** genera un `JWT_SECRET` propio de al menos 32 caracteres y no lo compartas.
   El `.env` **no debe versionarse** (ya está en `.gitignore`).

2. Levanta todo el sistema:

   ```bash
   docker compose up -d --build
   ```

   El compose base solo levanta MySQL, backend y frontend. MySQL y la API quedan
   publicados en `127.0.0.1`; `DB_ROOT_PASSWORD` y `DB_APP_PASSWORD` son obligatorias.
   Mailpit y phpMyAdmin viven únicamente en `docker-compose.local.yml` para desarrollo.

3. Accede a:

   - Aplicación web: http://localhost:5173
   - Backend (API): http://localhost:8082
   - Swagger/OpenAPI: http://localhost:8082/swagger-ui/index.html (deshabilitable con `SWAGGER_ENABLED=false`)

   Con el override local también tendrás phpMyAdmin (`:8086`) y Mailpit (`:8026`).

4. Usuario administrador (lo crea el `DataSeeder` en el primer arranque):

   ```
   usuario: admin
   contraseña: la definida en ADMIN_PASSWORD (.env)
   ```

   ⚠️ `ADMIN_PASSWORD` es obligatoria: el backend **no arranca** con `admin123` salvo que
   definas `ALLOW_DEFAULT_ADMIN_PASSWORD=true` en desarrollo local. Cambia la contraseña
   desde la interfaz antes de producción.

   Tras 5 intentos fallidos la cuenta se bloquea 15 minutos; además, la sesión se cierra
   automáticamente tras 15 minutos sin interacción del usuario.

### Sesión y contraseñas

- El **access token** vive solo en memoria; el **refresh token** se guarda en una cookie
  `HttpOnly; SameSite=Strict` (marca `COOKIE_SECURE=true` cuando uses HTTPS).
- Al recargar la página, la sesión se recupera automáticamente con `/auth/refresh`.
- La política de contraseñas es **8–12 caracteres**, con al menos una mayúscula, una minúscula,
  un número y un carácter especial. Se aplica al registro, creación de usuarios, cambio y
  restablecimiento, con barra de progreso en la interfaz.

## Ejecutar en paralelo con otros contenedores

Si ya tienes otros proyectos Docker usando los puertos habituales, levanta esta copia con el
override `docker-compose.local.yml` (proyecto `helpdesk-local`, contenedores y volúmenes propios,
así no se recrean ni se tocan los de otros stacks):

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5174 |
| Swagger/OpenAPI | http://localhost:8089/swagger-ui/index.html |
| phpMyAdmin | http://localhost:8086 |
| Mailpit | http://localhost:8026 |
| MySQL | `localhost:3312` |

Ese modo usa Mailpit para el correo (no envía correos reales por Gmail). Los contenedores se
llaman `helpdesk_local_*` y los volúmenes `helpdesk-local_*`, así que los datos son independientes
de cualquier otro stack que tengas levantado.

El frontend local escucha en `0.0.0.0:5174` para permitir el acceso desde otros
dispositivos de la LAN. Abre `http://TU_IP:5174` desde el otro equipo y define
`PUBLIC_FRONTEND_URL=http://TU_IP:5174` en `.env` para que los enlaces de correo
(restablecer contraseña) apunten a la IP correcta.

Si solo quieres acceso desde este equipo, pon `FRONTEND_BIND=127.0.0.1` en `.env`.
Si otro dispositivo no conecta, revisa el firewall de Windows y permite el puerto `5174`
en la red privada. La API y MySQL siguen publicados solo en `127.0.0.1`; el frontend
las proxya internamente.

### PostgreSQL / Supabase

El backend incluye un perfil `postgres` para desplegar sobre Supabase:

```bash
SPRING_PROFILES_ACTIVE=postgres
```

La guía completa (conexión, Flyway, Vercel y migración de datos MySQL → Postgres)
está en [`docs/DESPLIEGUE_POSTGRES_SUPABASE.md`](docs/DESPLIEGUE_POSTGRES_SUPABASE.md).

Para copiar datos existentes:

```bash
pip install -r scripts/migrate/requirements.txt
python scripts/migrate/mysql_to_postgres.py
```

### Checklist para producción con varios usuarios

1. Publica **un solo dominio** con HTTPS, por ejemplo `https://helpdesk.miempresa.com`.
2. Sirve el frontend y proxya `/api` y `/ws` bajo ese mismo dominio (Nginx ya lo hace).
3. Configura:
   ```env
   FRONTEND_BIND=127.0.0.1
   PUBLIC_FRONTEND_URL=https://helpdesk.miempresa.com
   FRONTEND_URL=https://helpdesk.miempresa.com
   CORS_ALLOWED_ORIGINS=https://helpdesk.miempresa.com
   COOKIE_SECURE=true
   ```
4. No publiques MySQL, phpMyAdmin, Mailpit ni el backend a Internet.
5. Ajusta capacidad según usuarios concurrentes: `DB_POOL_MAX` (20 por defecto) y
   `LOGIN_IP_ATTEMPTS` (120/min por IP; el límite por cuenta sigue en 5/min).
6. Una instancia soporta varios usuarios y dispositivos; cada login crea su propio
   refresh token. “Cerrar otras sesiones” revoca los demás dispositivos.
7. Si vas a usar **varias réplicas** del backend, mueve rate limit/lockout a Redis y
   los adjuntos a almacenamiento compartido; los WebSocket necesitan balanceo sticky.
8. Antes de abrir al público: backup probado, monitoreo, 2FA de administradores y
   pruebas de carga con logins concurrentes.

### Subidas seguras

Los adjuntos se validan por **contenido real** (magic bytes), no solo por extensión; se comprueba
que las imágenes se puedan decodificar y que no superen dimensiones seguras, se aplican cuotas por
usuario y límites de tamaño, y opcionalmente se escanean con **ClamAV** (`CLAMAV_HOST`). Las firmas
y fotos de actas también se validan antes de guardarse.

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DB_*` | Credenciales de MySQL para desarrollo local |
| `DB_ROOT_PASSWORD` | Contraseña de root de MySQL en Docker |
| `DB_APP_USER` / `DB_APP_PASSWORD` | Usuario de aplicación de MySQL (sin privilegios de root) |
| `JWT_SECRET` | Secreto de firma de tokens JWT (mín. 32 caracteres, **obligatorio**) |
| `JWT_EXPIRATION` | Duración del access token en ms (por defecto 30 min) |
| `COOKIE_SECURE` | `true` en producción con HTTPS para la cookie de refresh |
| `ADMIN_PASSWORD` | Contraseña inicial del admin (**obligatoria**) |
| `ALLOW_DEFAULT_ADMIN_PASSWORD` | Solo desarrollo: permite `admin123` |
| `MAX_LOGIN_ATTEMPTS` / `LOCK_MINUTES` | Intentos fallidos antes del bloqueo y minutos de bloqueo (5 / 15) |
| `IDLE_TIMEOUT_MINUTES` | Minutos de inactividad antes de cerrar la sesión (15; `0` desactiva) |
| `VITE_IDLE_TIMEOUT_MINUTES` | Mismo valor para el temporizador del frontend (se aplica al compilar) |
| `CLAMAV_HOST` / `CLAMAV_PORT` | Escaneo antivirus opcional de subidas (vacío = sin escaneo) |
| `CLAMAV_FAIL_CLOSED` | `true` rechaza archivos si ClamAV no responde (recomendado en producción) |
| `MAIL_HOST/PORT/USERNAME/PASSWORD` | SMTP (Mailpit en desarrollo, Gmail en producción) |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos (separados por coma) |
| `SWAGGER_ENABLED` | `true`/`false` para Swagger/OpenAPI (por defecto `false`) |
| `APP_TZ` | Zona horaria del backend (por defecto `America/Lima`) |

## Desarrollo local

### Backend

```bash
cd backend
mvn spring-boot:run   # requiere .env cargado (JWT_SECRET, DB)
```

### Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173 (llama al backend en localhost:8081)
```

## Tests

```bash
# Backend (JUnit + Mockito)
cd backend
mvn test

# Frontend (Vitest + jsdom)
cd frontend
npm test          # una ejecución
npm run test:watch
```

Cubren bloqueo por intentos fallidos, inactividad de sesión, rotación/revocación de refresh
tokens, escalada de privilegios, permisos de roles, saneado de errores, validación de archivos y
utilidades del frontend. Los tests de **ArchUnit** verifican que se respeten las capas
MVC → servicio → DAO (ver [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)).

## Scripts de frontend

```bash
npm run build    # typecheck + build de producción
npm run lint     # oxlint
```

## Scripts de base de datos

En `database/` hay migraciones manuales que se aplican vía:

```bash
docker exec -i helpdesk_mysql mysql -uroot -proot helpdesk_db < database/script.sql
```

## Seguridad

- El archivo `.env` (con credenciales reales) **no debe subirse a Git**. Ya está en `.gitignore`;
  si lo subiste en algún commit anterior, **rota las contraseñas** y purga el historial
  (`git filter-repo` / BFG).
- En producción: establece `CORS_ALLOWED_ORIGINS`, `SWAGGER_ENABLED=false` y `JWT_SECRET` fuerte.
- El secreto JWT débil o ausente hace fallar el arranque del backend (fail-fast).