package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.ActivoTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ActivoTicketRepository extends JpaRepository<ActivoTicket, Long> {
    List<ActivoTicket> findByActivoIdOrderByFechaCreacionDesc(Long activoId);
    List<ActivoTicket> findByTicketId(Long ticketId);
    boolean existsByActivoIdAndTicketId(Long activoId, Long ticketId);
    Optional<ActivoTicket> findByActivoIdAndTicketId(Long activoId, Long ticketId);
}
