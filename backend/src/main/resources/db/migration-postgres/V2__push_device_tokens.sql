-- Tokens de Firebase Cloud Messaging para notificaciones push.
CREATE TABLE IF NOT EXISTS push_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL,
    plataforma VARCHAR(20) NOT NULL,
    actualizado_en TIMESTAMP NOT NULL,
    CONSTRAINT uk_push_tokens_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON push_device_tokens (usuario_id);
