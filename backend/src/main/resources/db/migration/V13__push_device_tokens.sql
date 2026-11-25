-- Tokens de Firebase Cloud Messaging para notificaciones push.
CREATE TABLE `push_device_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `plataforma` VARCHAR(20) NOT NULL,
    `actualizado_en` DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_push_tokens_token` (`token`),
    KEY `idx_push_tokens_usuario` (`usuario_id`),
    CONSTRAINT `fk_push_tokens_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
