-- Ajuste de tipos: Hibernate 6 con MySQLDialect mapea @Enumerated(STRING) a ENUM.
-- La V7 creó las columnas como varchar; se convierten a enum para que la
-- validación de esquema (ddl-auto=validate) coincida.
ALTER TABLE `monitoring_incidents`
  MODIFY COLUMN `tipo` enum('HTTP','TCP') DEFAULT NULL,
  MODIFY COLUMN `estado` enum('ABIERTA','RESUELTA') NOT NULL;
