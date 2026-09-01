-- ============================================================
-- Corrige la columna `status` de password_reset_requests.
--
-- Problema: la tabla fue creada por una version antigua de la
-- entidad con enum('PENDIENTE','APROBADO','RECHAZADO'), pero el
-- codigo Java actual usa PENDIENTE / COMPLETADO / EXPIRADO.
-- Al aprobar un reset, guardar 'COMPLETADO' fallaba con:
--   "Data truncated for column 'status' at row 1"
-- ddl-auto: update nunca modifica columnas existentes, por eso
-- se corrige manualmente. Se usa VARCHAR(50) para tolerar
-- futuros estados nuevos sin volver a fallar.
--
-- Ejecutar: docker exec -i helpdesk_mysql mysql -uroot -proot helpdesk_db < fix_status_enum.sql
-- ============================================================

USE helpdesk_db;

ALTER TABLE password_reset_requests
    MODIFY COLUMN status VARCHAR(50) NOT NULL;
