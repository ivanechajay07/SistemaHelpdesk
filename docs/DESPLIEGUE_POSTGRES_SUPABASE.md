# Despliegue con PostgreSQL / Supabase

El proyecto ahora soporta dos motores:

- **MySQL**: perfil por defecto, usado por el `docker-compose` local.
- **PostgreSQL**: perfil `postgres`, usado por Supabase.

El backend Spring Boot sigue necesitando un host con Java (Railway, Render, Fly.io, etc.).
Supabase aporta PostgreSQL, Storage y otros servicios, pero **no ejecuta el backend**.

## 1. Crear el proyecto en Supabase

1. Crea un proyecto en Supabase.
2. Copia la contraseña de la base de datos.
3. Usa la conexión **Session Pooler** o directa para Flyway:
   - Host: `aws-0-<region>.pooler.supabase.com`
   - Puerto: `5432` (Session Pooler)
   - Base de datos: `postgres`
   - Usuario: `postgres.<project-ref>`
   - SSL: obligatorio

> Para la aplicación puedes usar el Transaction Pooler en `6543`, pero Flyway
> necesita una conexión de sesión. Lo más simple es usar Session Pooler para todo.

## 2. Variables del backend

```env
SPRING_PROFILES_ACTIVE=postgres
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USERNAME=postgres.<project-ref>
DB_PASSWORD=<password-de-supabase>
DB_SSLMODE=require

JWT_SECRET=<secreto-de-64-caracteres>
ADMIN_PASSWORD=<password-fuerte>
COOKIE_SECURE=true
CORS_ALLOWED_ORIGINS=https://app.tudominio.com
FRONTEND_URL=https://app.tudominio.com
PUBLIC_FRONTEND_URL=https://app.tudominio.com
SWAGGER_ENABLED=false
UPLOAD_DIR=/app/uploads
```

Si el backend corre en un contenedor con filesystem efímero, monta un volumen
persistente en `/app/uploads` o migra los adjuntos a Supabase Storage.

## 3. Aplicar el esquema

### Instalación nueva

Arranca el backend con el perfil `postgres`. Flyway aplicará
`backend/src/main/resources/db/migration/postgres/V1__baseline_postgres.sql`
y `DataSeeder` creará roles, permisos y el administrador.

### Migrar datos existentes desde MySQL

1. Aplica el baseline con `psql` **antes** de arrancar el backend (para evitar
   que `DataSeeder` cree un administrador distinto).
2. Ejecuta `scripts/migrate/mysql_to_postgres.py`.
3. Arranca el backend con `JPA_DDL_AUTO=validate` y `FLYWAY_ENABLED=true`.

Guía detallada: `scripts/migrate/README.md`.

## 4. Backend en Railway/Render/Fly

- Build: `backend/Dockerfile`
- Puerto: `8080`
- Healthcheck: TCP/HTTP al puerto 8080
- Volumen: `/app/uploads`
- WebSocket: habilitado por el host (Railway/Render lo soportan)

Variables adicionales:

```env
DB_POOL_MAX=20
DB_POOL_MIN=5
LOGIN_IP_ATTEMPTS=120
```

## 5. Frontend en Vercel

- Root Directory: `frontend`
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Node: 22

Variables:

```env
VITE_API_URL=https://api.tudominio.com/api/v1
VITE_PUBLIC_APP_URL=https://app.tudominio.com
VITE_IDLE_TIMEOUT_MINUTES=15
```

Añade un `frontend/vercel.json` con rewrite SPA:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 6. Dominios y cookies

Usa subdominios del mismo dominio:

```text
app.tudominio.com  → Vercel
api.tudominio.com  → Railway/Render/Fly
```

La cookie de refresh es `HttpOnly; SameSite=Strict`. Si frontend y API están en
dominios distintos (`*.vercel.app` y `*.up.railway.app`), la cookie no se envía y
la sesión se pierde al recargar.

Configura:

```env
COOKIE_SECURE=true
CORS_ALLOWED_ORIGINS=https://app.tudominio.com
FRONTEND_URL=https://app.tudominio.com
PUBLIC_FRONTEND_URL=https://app.tudominio.com
```

## 7. Verificación

```bash
# Backend
curl -i https://api.tudominio.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"..."}'

# Debe devolver Set-Cookie HD_REFRESH con HttpOnly y Secure.

# Frontend
curl -I https://app.tudominio.com/login
```

Comprueba también:

- Login, refresh y logout.
- WebSocket del chat (`wss://api.tudominio.com/ws/chat`).
- Subida y descarga de adjuntos.
- Reinicio del backend (los adjuntos deben persistir).

## 8. Limitaciones actuales

- La autenticación sigue siendo propia (JWT + refresh tokens), no Supabase Auth.
- Los adjuntos usan filesystem local/HMAC, no Supabase Storage.
- No hay migración automática de datos: es un script explícito y verificable.
- Si usas varias réplicas del backend, mueve rate limit/lockout a Redis y los
  adjuntos a almacenamiento compartido.
