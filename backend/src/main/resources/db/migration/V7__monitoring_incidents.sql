-- Incidencias de monitoreo: cada caída detectada sobre un objetivo, con su
-- duración y estado. Permite el dashboard de incidencias por día/mes/año.
CREATE TABLE IF NOT EXISTS `monitoring_incidents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `target_id` bigint DEFAULT NULL,
  `target_nombre` varchar(120) NOT NULL,
  `tipo` varchar(10) DEFAULT NULL,
  `host` varchar(500) DEFAULT NULL,
  `inicio` datetime(6) NOT NULL,
  `fin` datetime(6) DEFAULT NULL,
  `duracion_segundos` bigint DEFAULT NULL,
  `estado` varchar(12) NOT NULL,
  `ticket_id` bigint DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_incident_target` (`target_id`),
  KEY `idx_incident_inicio` (`inicio`),
  KEY `idx_incident_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
