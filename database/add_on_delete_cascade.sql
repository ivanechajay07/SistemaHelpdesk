-- ============================================================
-- Agrega ON DELETE CASCADE a las llaves foráneas que referencian
-- a `usuarios`, para permitir eliminar usuarios sin errores de
-- foreign key constraint.
--
-- Ejecutar: docker exec -i helpdesk_mysql mysql -uroot -proot helpdesk_db < add_on_delete_cascade.sql
-- ============================================================

USE helpdesk_db;

-- ---------- FKs que referencian a `usuarios` ----------

-- Solicitudes de recuperación de contraseña (causa del error original)
ALTER TABLE password_reset_requests DROP FOREIGN KEY FKeuykok9sfjhpmlh4dusqg00dl;
ALTER TABLE password_reset_requests ADD CONSTRAINT FK_prr_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- Roles asignados al usuario (tabla de join ManyToMany)
ALTER TABLE usuario_roles DROP FOREIGN KEY FKuu9tea04xb29m2km5lwe46ua;
ALTER TABLE usuario_roles ADD CONSTRAINT FK_usuario_roles_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- Historial de tickets realizado por el usuario
ALTER TABLE ticket_historial DROP FOREIGN KEY FK6sroco0brin211eidpbu69po6;
ALTER TABLE ticket_historial ADD CONSTRAINT FK_historial_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- Mensajes enviados por el usuario
ALTER TABLE ticket_mensajes DROP FOREIGN KEY FK7xhkiketm5sbyavf4954q09l9;
ALTER TABLE ticket_mensajes ADD CONSTRAINT FK_mensajes_remitente
    FOREIGN KEY (remitente_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- Archivos subidos por el usuario
ALTER TABLE ticket_archivos DROP FOREIGN KEY FKeicyghpu1qxo5u18n3q8mqllu;
ALTER TABLE ticket_archivos ADD CONSTRAINT FK_archivos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- Tickets creados por el usuario: se eliminan junto con él
ALTER TABLE tickets DROP FOREIGN KEY FK85yjag848d2q9y3rxsidmpdfq;
ALTER TABLE tickets ADD CONSTRAINT FK_tickets_solicitante
    FOREIGN KEY (solicitante_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- Tickets ASIGNADOS al usuario (técnico): NO se eliminan,
-- solo se desasignan (SET NULL) para no perder tickets del sistema
ALTER TABLE tickets DROP FOREIGN KEY FKcnx2jyp47ivh1qh6beokmb5yw;
ALTER TABLE tickets ADD CONSTRAINT FK_tickets_tecnico
    FOREIGN KEY (tecnico_id) REFERENCES usuarios (id) ON DELETE SET NULL;

-- ---------- FKs hijas de `tickets` (necesarias para que la
-- ---------- eliminación en cascada de tickets no falle) ----------

ALTER TABLE ticket_historial DROP FOREIGN KEY FKlkg2wexc6qt1oawmymcanx60e;
ALTER TABLE ticket_historial ADD CONSTRAINT FK_historial_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE;

ALTER TABLE ticket_mensajes DROP FOREIGN KEY FK53k84h3a8sln838xhx440eep5;
ALTER TABLE ticket_mensajes ADD CONSTRAINT FK_mensajes_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE;

ALTER TABLE ticket_archivos DROP FOREIGN KEY FKswel01tr5co9drlbmg1reh74m;
ALTER TABLE ticket_archivos ADD CONSTRAINT FK_archivos_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE;

-- Adjunto ligado a un mensaje: si el mensaje se elimina, el adjunto también
ALTER TABLE ticket_archivos DROP FOREIGN KEY FKlct9edri62orqk3hn2nq6gdeh;
ALTER TABLE ticket_archivos ADD CONSTRAINT FK_archivos_mensaje
    FOREIGN KEY (mensaje_id) REFERENCES ticket_mensajes (id) ON DELETE CASCADE;
