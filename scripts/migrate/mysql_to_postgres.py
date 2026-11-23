#!/usr/bin/env python3
"""
Copia los datos de HelpDesk PRO desde MySQL a PostgreSQL.

Requisitos:
    pip install pymysql psycopg2-binary

Uso (sin escribir credenciales en el código):
    SOURCE_HOST=127.0.0.1 SOURCE_PORT=3312 SOURCE_DB=helpdesk_db \\
    SOURCE_USER=helpdesk SOURCE_PASSWORD=... \\
    TARGET_HOST=127.0.0.1 TARGET_PORT=5434 TARGET_DB=helpdesk \\
    TARGET_USER=postgres TARGET_PASSWORD=... \\
    python scripts/migrate/mysql_to_postgres.py

El esquema destino debe existir (Flyway V1__baseline_postgres.sql).
Se preservan IDs y se reajustan las secuencias al final.
"""
import json
import os
import sys
from collections import defaultdict, deque
from datetime import date, datetime
from decimal import Decimal

import pymysql
import psycopg2
from psycopg2.extras import Json

SOURCE = {
    "host": os.getenv("SOURCE_HOST", "127.0.0.1"),
    "port": int(os.getenv("SOURCE_PORT", "3306")),
    "db": os.getenv("SOURCE_DB", "helpdesk_db"),
    "user": os.getenv("SOURCE_USER", "helpdesk"),
    "password": os.getenv("SOURCE_PASSWORD", ""),
}
TARGET = {
    "host": os.getenv("TARGET_HOST", "127.0.0.1"),
    "port": int(os.getenv("TARGET_PORT", "5432")),
    "db": os.getenv("TARGET_DB", "helpdesk"),
    "user": os.getenv("TARGET_USER", "postgres"),
    "password": os.getenv("TARGET_PASSWORD", ""),
}

SKIP_TABLES = {"flyway_schema_history", "databasechangelog", "databasechangeloglock"}


def mysql_connection():
    return pymysql.connect(
        **SOURCE,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def postgres_connection():
    return psycopg2.connect(
        host=TARGET["host"],
        port=TARGET["port"],
        dbname=TARGET["db"],
        user=TARGET["user"],
        password=TARGET["password"],
    )


def table_order(cur):
    """Orden topológico simple según claves foráneas de MySQL."""
    cur.execute(
        """
        SELECT TABLE_NAME, REFERENCED_TABLE_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = %s
          AND REFERENCED_TABLE_NAME IS NOT NULL
          AND TABLE_NAME <> REFERENCED_TABLE_NAME
        """,
        (SOURCE["db"],),
    )
    edges = cur.fetchall()
    cur.execute(
        """
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s AND TABLE_TYPE = 'BASE TABLE'
        """,
        (SOURCE["db"],),
    )
    tables = {row["TABLE_NAME"] for row in cur.fetchall()} - SKIP_TABLES

    deps = defaultdict(set)
    children = defaultdict(set)
    for row in edges:
        child, parent = row["TABLE_NAME"], row["REFERENCED_TABLE_NAME"]
        if child in tables and parent in tables:
            deps[child].add(parent)
            children[parent].add(child)

    ready = deque(sorted(table for table in tables if not deps[table]))
    ordered = []
    while ready:
        table = ready.popleft()
        ordered.append(table)
        for child in sorted(children[table]):
            deps[child].discard(table)
            if not deps[child] and child not in ordered:
                ready.append(child)

    if len(ordered) != len(tables):
        pending = sorted(tables - set(ordered))
        print(f"AVISO: ciclo de FK detectado, se copian al final: {', '.join(pending)}", file=sys.stderr)
        ordered.extend(pending)
    return ordered


def postgres_columns(pg_cur):
    pg_cur.execute(
        """
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        """
    )
    columns = defaultdict(dict)
    for table, column, data_type, udt_name in pg_cur.fetchall():
        columns[table][column] = (data_type, udt_name)
    return columns


def normalize(value, pg_type):
    data_type, udt_name = pg_type
    if value is None:
        return None
    if data_type == "boolean":
        if isinstance(value, (bytes, bytearray)):
            return bool(value[0]) if value else False
        return bool(value)
    if udt_name in ("json", "jsonb") and isinstance(value, str):
        try:
            return Json(json.loads(value))
        except json.JSONDecodeError:
            return Json(value)
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (datetime, date)):
        return value
    return value


def main():
    if not SOURCE["password"] or not TARGET["password"]:
        print("Define SOURCE_PASSWORD y TARGET_PASSWORD.", file=sys.stderr)
        return 1

    my = mysql_connection()
    pg = postgres_connection()
    my_cur = my.cursor()
    pg_cur = pg.cursor()

    order = table_order(my_cur)
    target_columns = postgres_columns(pg_cur)
    total_rows = 0

    # Desactivar triggers de FK durante la carga si el usuario tiene permiso.
    try:
        pg_cur.execute("SET session_replication_role = 'replica'")
    except Exception:
        pg.rollback()
        print("AVISO: no se pudieron desactivar triggers; se usará el orden topológico.", file=sys.stderr)

    for table in order:
        if table not in target_columns:
            print(f"OMITIDA {table}: no existe en PostgreSQL")
            continue

        my_cur.execute(f"SELECT * FROM `{table}`")
        rows = my_cur.fetchall()
        if not rows:
            print(f"{table}: 0 filas")
            continue

        columns = [c for c in rows[0].keys() if c in target_columns[table]]
        placeholders = ", ".join(["%s"] * len(columns))
        quoted = ", ".join(f'"{c}"' for c in columns)
        insert = f'INSERT INTO "{table}" ({quoted}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

        values = [
            [normalize(row.get(column), target_columns[table][column]) for column in columns]
            for row in rows
        ]
        pg_cur.executemany(insert, values)
        total_rows += len(values)
        print(f"{table}: {len(values)} filas")

    # Reajustar secuencias identity.
    for table, columns in target_columns.items():
        if "id" not in columns:
            continue
        pg_cur.execute(
            """
            SELECT pg_get_serial_sequence(%s, 'id')
            """,
            (f"public.{table}",),
        )
        sequence = pg_cur.fetchone()[0]
        if not sequence:
            continue
        pg_cur.execute(f'SELECT COALESCE(MAX(id), 1) FROM "{table}"')
        maximum = pg_cur.fetchone()[0]
        pg_cur.execute("SELECT setval(%s, %s, true)", (sequence, maximum))

    pg.commit()
    my.close()
    pg.close()
    print(f"Migración completada: {total_rows} filas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
