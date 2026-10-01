# HelpDesk PRO

Sistema empresarial de soporte técnico (help desk) con gestión de tickets, chat en tiempo real,
inventario de activos, actas de conformidad, tareas, monitoreo de red, base de conocimiento y auditoría.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 3.2, Spring Security + JWT, Spring Data JPA, WebSocket (STOMP), MySQL 8 |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, React Router 7, Recharts, jsPDF, SheetJS |
| Infra | Docker Compose (MySQL, Mailpit, phpMyAdmin, Nginx) |

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

3. Accede a:

   - Aplicación web: http://localhost:5173
   - Backend (API): http://localhost:8082
   - Swagger/OpenAPI: http://localhost:8082/swagger-ui/index.html (deshabilitable con `SWAGGER_ENABLED=false`)
   - phpMyAdmin: http://localhost:8083
   - Mailpit (correos en desarrollo): http://localhost:8025

4. Usuario por defecto (lo crea el `DataSeeder` en el primer arranque):

   ```
   usuario: admin
   contraseña: admin123
   ```

   ⚠️ Cambia la contraseña del admin antes de producción.

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DB_*` | Credenciales de MySQL |
| `JWT_SECRET` | Secreto de firma de tokens JWT (mín. 32 caracteres, **obligatorio**) |
| `JWT_EXPIRATION` | Duración del access token en ms |
| `MAIL_HOST/PORT/USERNAME/PASSWORD` | SMTP (Mailpit en desarrollo, Gmail en producción) |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos (separados por coma) |
| `SWAGGER_ENABLED` | `true`/`false` para Swagger/OpenAPI |
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