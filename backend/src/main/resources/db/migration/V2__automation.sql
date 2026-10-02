-- Fase 4: automatización (ajustes persistentes + marca de escalado de SLA)

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `tickets` ADD COLUMN `escalado_sla` bit(1) NOT NULL DEFAULT b'0';
