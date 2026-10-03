-- Bloqueo optimista de activos (@Version): las filas creadas antes de que existiera
-- la columna quedaron con `version` NULL. Al actualizar el activo (p. ej. al registrar
-- un movimiento, editar o prestar) Hibernate no podía resolver la versión y la
-- transacción fallaba con "Could not commit JPA transaction".
--
-- Se rellena con 0 y se deja NOT NULL con DEFAULT 0 para que futuras inserciones
-- (incluidas las que no especifiquen versión) sean válidas.

UPDATE `inventario_activos` SET `version` = 0 WHERE `version` IS NULL;

ALTER TABLE `inventario_activos`
  MODIFY COLUMN `version` bigint NOT NULL DEFAULT 0;
