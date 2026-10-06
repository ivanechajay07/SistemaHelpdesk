-- Nuevo tipo de objetivo: PING (ICMP). Permite vigilar equipos (PCs, impresoras,
-- routers) por IP sin depender de un puerto HTTP/TCP abierto.
ALTER TABLE `monitored_targets`
  MODIFY COLUMN `tipo` enum('HTTP','TCP','PING') NOT NULL;
