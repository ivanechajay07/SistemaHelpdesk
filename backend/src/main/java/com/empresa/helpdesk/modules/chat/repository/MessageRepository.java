package com.empresa.helpdesk.modules.chat.repository;

import com.empresa.helpdesk.modules.chat.entity.Message;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    // Carga remitente y adjunto en la misma consulta (evita N+1 al mapear el historial)
    @EntityGraph(attributePaths = {"remitente", "adjunto"})
    List<Message> findByTicketIdOrderByFechaEnvioAsc(Long ticketId);

    // Mensajes de un ticket que el destinatario (cualquiera que no sea el remitente) aún no ha leído
    List<Message> findByTicketIdAndLeidoFalseAndRemitenteIdNot(Long ticketId, Long remitenteId);

    /**
     * Cuenta los mensajes no leídos por ticket para un usuario
     * (participa como solicitante o técnico asignado y no es el remitente).
     */
    @Query("""
        SELECT m.ticket.id AS ticketId, COUNT(m) AS total
        FROM Message m
        WHERE m.leido = false
          AND m.remitente.id <> :userId
          AND (
            m.ticket.solicitante.id = :userId
            OR m.ticket.tecnico.id = :userId
          )
        GROUP BY m.ticket.id
        """)
    List<Object[]> countUnreadByTicketForUser(@Param("userId") Long userId);

    /** Total de mensajes no leídos del usuario en todos sus tickets. */
    @Query("""
        SELECT COUNT(m)
        FROM Message m
        WHERE m.leido = false
          AND m.remitente.id <> :userId
          AND (
            m.ticket.solicitante.id = :userId
            OR m.ticket.tecnico.id = :userId
          )
        """)
    long countTotalUnreadForUser(@Param("userId") Long userId);

    /** Marca como leídos todos los mensajes recibidos de un ticket y devuelve cuántos se marcaron. */
    @Modifying
    @Query("""
        UPDATE Message m
        SET m.leido = true, m.fechaLectura = :now
        WHERE m.ticket.id = :ticketId
          AND m.remitente.id <> :userId
          AND m.leido = false
        """)
    int markTicketMessagesAsRead(@Param("ticketId") Long ticketId,
                                 @Param("userId") Long userId,
                                 @Param("now") LocalDateTime now);
}
