-- Fase 5: verificación en dos pasos (TOTP)

ALTER TABLE `usuarios`
  ADD COLUMN `two_factor_enabled` bit(1) NOT NULL DEFAULT b'0',
  ADD COLUMN `two_factor_secret` text DEFAULT NULL;
