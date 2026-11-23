# Migración MySQL → PostgreSQL / Supabase

## Requisitos

```bash
pip install -r scripts/migrate/requirements.txt
```

## 1. Crear el esquema en PostgreSQL

Para una base **vacía**, arranca el backend con el perfil `postgres` y deja que Flyway aplique `V1__baseline_postgres.sql`:

```env
SPRING_PROFILES_ACTIVE=postgres
DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USERNAME=postgres
DB_PASSWORD=...
DB_SSLMODE=require
```

Para migrar **datos existentes**, aplica primero el baseline sin arrancar el backend (para evitar que `DataSeeder` cree un admin antes de copiar el original):

```bash
psql "host=... port=5432 dbname=postgres user=postgres sslmode=require" \
  -f backend/src/main/resources/db/migration/postgres/V1__baseline_postgres.sql
```

## 2. Copiar los datos

```bash
SOURCE_HOST=127.0.0.1 \
SOURCE_PORT=3306 \
SOURCE_DB=helpdesk_db \
SOURCE_USER=helpdesk \
SOURCE_PASSWORD=... \
TARGET_HOST=... \
TARGET_PORT=5432 \
TARGET_DB=postgres \
TARGET_USER=postgres \
TARGET_PASSWORD=... \
python scripts/migrate/mysql_to_postgres.py
```

En Windows PowerShell:

```powershell
$env:SOURCE_HOST="127.0.0.1"
$env:SOURCE_PORT="3312"
$env:SOURCE_DB="helpdesk_db"
$env:SOURCE_USER="helpdesk"
$env:SOURCE_PASSWORD="..."
$env:TARGET_HOST="..."
$env:TARGET_PORT="5432"
$env:TARGET_DB="postgres"
$env:TARGET_USER="postgres"
$env:TARGET_PASSWORD="..."
python scripts/migrate/mysql_to_postgres.py
```

El script:

- Respeta el orden de claves foráneas.
- Conserva los IDs originales.
- Convierte booleanos, fechas, JSON y decimales.
- Reajusta las secuencias identity.
- No copia `flyway_schema_history`.

## 3. Verificar

```sql
SELECT 'tickets' AS tabla, count(*) FROM tickets
UNION ALL SELECT 'usuarios', count(*) FROM usuarios
UNION ALL SELECT 'inventario_activos', count(*) FROM inventario_activos;
```

Compara esos conteos con MySQL y arranca el backend con:

```env
SPRING_PROFILES_ACTIVE=postgres
JPA_DDL_AUTO=validate
FLYWAY_ENABLED=true
```

Si Hibernate valida y el login funciona, la migración está completa.

## Nota sobre archivos adjuntos

Los adjuntos viven en `UPLOAD_DIR`. En un host con filesystem efímero (Railway/Render) monta un volumen persistente o migra los archivos a Supabase Storage. La base de datos no contiene los binarios.
