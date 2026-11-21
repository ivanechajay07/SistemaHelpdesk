-- Ajuste de tipos para que coincidan con el mapeo JPA (Hibernate ddl-auto=validate):
-- los identificadores son cadenas de longitud fija lógica, pero VARCHAR evita
-- problemas de validación y comparación entre motores.
ALTER TABLE `refresh_tokens`
    MODIFY COLUMN `token_hash` VARCHAR(64) NOT NULL,
    MODIFY COLUMN `familia` VARCHAR(36) NOT NULL;
