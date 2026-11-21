-- ============================================================
-- Endurecimiento de seguridad: refresh tokens con estado y
-- protección anti-replay para códigos TOTP.
-- ============================================================

-- Paso TOTP ya utilizado por el usuario (evita reutilizar un código
-- dentro de la ventana de ±30s). NULL = ningún código usado aún.
ALTER TABLE `usuarios`
    ADD COLUMN `two_factor_last_step` BIGINT NULL;

-- Refresh tokens opacos con hash, familia y revocación en servidor.
-- Permite logout real, rotación y detección de reutilización.
CREATE TABLE `refresh_tokens` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT       NOT NULL,
    `token_hash` CHAR(64)     NOT NULL,
    `familia`    CHAR(36)     NOT NULL,
    `expira`     DATETIME(6)  NOT NULL,
    `revocado`   BIT(1)       NOT NULL DEFAULT b'0',
    `creado`     DATETIME(6)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_refresh_tokens_hash` (`token_hash`),
    KEY `idx_refresh_tokens_familia` (`familia`),
    KEY `idx_refresh_tokens_usuario` (`usuario_id`),
    KEY `idx_refresh_tokens_expira` (`expira`),
    CONSTRAINT `fk_refresh_tokens_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
