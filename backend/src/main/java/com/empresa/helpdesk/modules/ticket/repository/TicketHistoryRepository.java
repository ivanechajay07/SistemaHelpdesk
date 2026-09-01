package com.empresa.helpdesk.modules.ticket.repository;

import com.empresa.helpdesk.modules.ticket.entity.TicketHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Long> {
    List<TicketHistory> findByTicketIdOrderByFechaRegistroDesc(Long ticketId);

    java.util.Optional<TicketHistory> findFirstByTicketIdAndAccionOrderByFechaRegistroDesc(Long ticketId, String accion);

    /** Reactivaciones realizadas por un usuario, de la más reciente a la más antigua. */
    @Query("""
        SELECT h
        FROM TicketHistory h
        WHERE h.accion = 'REACTIVACION'
          AND h.usuario.id = :usuarioId
        ORDER BY h.fechaRegistro DESC
        """)
    List<TicketHistory> findReactivacionesDeUsuario(@Param("usuarioId") Long usuarioId);
}
