-- Foto de perfil (avatar) del usuario: nombre del archivo guardado en uploads/avatars

ALTER TABLE `usuarios`
  ADD COLUMN `avatar_url` varchar(300) DEFAULT NULL;
