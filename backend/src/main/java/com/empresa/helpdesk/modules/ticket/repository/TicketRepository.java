package com.empresa.helpdesk.modules.ticket.repository;

import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByCodigo(String codigo);
    java.util.List<Ticket> findTop10ByOrderByFechaCreacionDesc();
    java.util.List<Ticket> findTop10BySolicitanteIdOrTecnicoIdOrderByFechaCreacionDesc(Long solicitanteId, Long tecnicoId);

    // Notificaciones: todos los tickets abiertos ordenados (administrador), sin los cerrados
    java.util.List<Ticket> findTop15ByEstadoNotInOrderByFechaCreacionDesc(java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados);

    // Notificaciones de técnicos/supervisores: solo sus tickets asignados no cerrados
    java.util.List<Ticket> findTop10ByTecnicoIdAndEstadoNotInOrderByFechaCreacionDesc(Long tecnicoId, java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados);

    // Notificaciones de clientes: solo sus tickets recientes no cerrados
    java.util.List<Ticket> findTop10BySolicitanteIdAndEstadoNotInOrderByFechaCreacionDesc(Long solicitanteId, java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados);
    java.util.List<Ticket> findTop5ByTituloContainingIgnoreCaseOrCodigoContainingIgnoreCaseOrderByFechaCreacionDesc(String titulo, String codigo);
    Page<Ticket> findBySolicitanteId(Long solicitanteId, Pageable pageable);
    Page<Ticket> findByTecnicoId(Long tecnicoId, Pageable pageable);
    Page<Ticket> findBySolicitanteIdOrTecnicoId(Long solicitanteId, Long tecnicoId, Pageable pageable);

    // Carga de trabajo por técnico (para la asignación automática)
    long countByTecnicoIdAndEstadoNotIn(Long tecnicoId, List<TicketStatus> estados);

    // Tickets vencidos de SLA que aún no han sido escalados
    List<Ticket> findByEscaladoSlaFalseAndEstadoNotInAndFechaEstimadaResolucionBefore(
            List<TicketStatus> estados, LocalDateTime corte);

    // Métodos para el Dashboard (globales - admin)
    long countByEstadoIn(java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados);
    
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(t) FROM Ticket t WHERE t.estado NOT IN :estados AND t.fechaEstimadaResolucion < CURRENT_TIMESTAMP")
    long countOverdueTickets(@org.springframework.data.repository.query.Param("estados") java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados);

    @org.springframework.data.jpa.repository.Query("SELECT MONTH(t.fechaCreacion) as mes, COUNT(t.id) as cantidad FROM Ticket t WHERE t.fechaCreacion >= :startDate GROUP BY MONTH(t.fechaCreacion) ORDER BY MONTH(t.fechaCreacion)")
    java.util.List<Object[]> countTicketsByMonth(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate);

    // Métodos para el Dashboard (filtrados por usuario)
    long countBySolicitanteIdOrTecnicoId(Long solicitanteId, Long tecnicoId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(t) FROM Ticket t WHERE t.estado IN :estados AND (t.solicitante.id = :userId OR t.tecnico.id = :userId)")
    long countByEstadoInAndUser(@org.springframework.data.repository.query.Param("estados") java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(t) FROM Ticket t WHERE (t.solicitante.id = :userId OR t.tecnico.id = :userId) AND t.estado NOT IN :estados AND t.fechaEstimadaResolucion < CURRENT_TIMESTAMP")
    long countOverdueTicketsByUser(@org.springframework.data.repository.query.Param("estados") java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT MONTH(t.fechaCreacion) as mes, COUNT(t.id) as cantidad FROM Ticket t WHERE (t.solicitante.id = :userId OR t.tecnico.id = :userId) AND t.fechaCreacion >= :startDate GROUP BY MONTH(t.fechaCreacion) ORDER BY MONTH(t.fechaCreacion)")
    java.util.List<Object[]> countTicketsByMonthForUser(@org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate, @org.springframework.data.repository.query.Param("userId") Long userId);

    // Tickets resueltos por técnico agrupados por mes (para el dashboard de rendimiento)
    @org.springframework.data.jpa.repository.Query("""
            SELECT t.tecnico.id,
                   CONCAT(t.tecnico.nombre, ' ', t.tecnico.apellidos),
                   MONTH(t.fechaResolucion),
                   COUNT(t.id)
            FROM Ticket t
            WHERE t.estado IN :estados
              AND t.fechaResolucion >= :start
              AND t.fechaResolucion < :end
              AND t.tecnico IS NOT NULL
            GROUP BY t.tecnico.id, t.tecnico.nombre, t.tecnico.apellidos, MONTH(t.fechaResolucion)
            ORDER BY t.tecnico.id, MONTH(t.fechaResolucion)
            """)
    java.util.List<Object[]> countResolvedByTechnicianByMonth(
            @org.springframework.data.repository.query.Param("estados") java.util.List<com.empresa.helpdesk.modules.ticket.enums.TicketStatus> estados,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}
