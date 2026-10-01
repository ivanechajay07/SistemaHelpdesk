package com.empresa.helpdesk.modules.acta.repository;

import com.empresa.helpdesk.modules.acta.entity.ActaConformidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ActaConformidadRepository extends JpaRepository<ActaConformidad, Long> {
    Optional<ActaConformidad> findByTicketId(Long ticketId);
    boolean existsByTicketId(Long ticketId);

    @Query("SELECT a FROM ActaConformidad a "
            + "JOIN FETCH a.ticket t "
            + "LEFT JOIN FETCH t.solicitante "
            + "LEFT JOIN FETCH t.tecnico "
            + "JOIN FETCH a.creadoPor "
            + "ORDER BY a.fechaCreacion DESC")
    List<ActaConformidad> findAllWithTicket();
}