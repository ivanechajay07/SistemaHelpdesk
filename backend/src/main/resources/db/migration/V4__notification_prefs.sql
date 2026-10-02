-- Preferencias de notificación por usuario (JSON: {"push":true,"email":false,...})

ALTER TABLE `usuarios`
  ADD COLUMN `notification_prefs` varchar(500) DEFAULT NULL;
