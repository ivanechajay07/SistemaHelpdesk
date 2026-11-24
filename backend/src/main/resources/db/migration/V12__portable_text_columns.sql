-- Alinea columnas MySQL con el tipo portable TEXT usado por PostgreSQL.
ALTER TABLE `actas_conformidad`
    MODIFY COLUMN `foto_data` TEXT NULL,
    MODIFY COLUMN `firma_solicitante` TEXT NOT NULL,
    MODIFY COLUMN `firma_tecnico` TEXT NOT NULL,
    MODIFY COLUMN `trabajos_realizados` TEXT NOT NULL;

ALTER TABLE `task_evidencias`
    MODIFY COLUMN `imagen_data` TEXT NOT NULL;
