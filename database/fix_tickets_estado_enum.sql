-- ============================================================
-- Habilita el nuevo estado EN_REVISION para tickets.
--
-- La columna estado era un ENUM cerrado de MySQL que no incluia
-- EN_REVISION, por lo que guardar ese valor fallaria con
-- "Data truncated for column 'estado'". Se cambia a VARCHAR(50)
-- para tolerar estados nuevos sin migraciones futuras.
--
-- Ejecutar: docker exec -i helpdesk_mysql mysql -uroot -proot helpdesk_db < fix_tickets_estado_enum.sql
-- ============================================================

USE helpdesk_db;

ALTER TABLE tickets
    MODIFY COLUMN estado VARCHAR(50) NOT NULL;
