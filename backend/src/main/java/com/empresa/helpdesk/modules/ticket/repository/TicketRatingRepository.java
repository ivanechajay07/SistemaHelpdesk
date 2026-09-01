package com.empresa.helpdesk.modules.ticket.repository;

import com.empresa.helpdesk.modules.ticket.entity.TicketRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TicketRatingRepository extends JpaRepository<TicketRating, Long> {

    Optional<TicketRating> findByTicketId(Long ticketId);

    boolean existsByTicketId(Long ticketId);

    @Query("SELECT AVG(r.puntaje) FROM TicketRating r")
    Double promedioGeneral();

    @Query("SELECT t.tecnico.id, AVG(r.puntaje) FROM TicketRating r JOIN r.ticket t WHERE t.tecnico IS NOT NULL GROUP BY t.tecnico.id")
    List<Object[]> promedioPorTecnico();

    @Query("SELECT MONTH(r.fechaCreacion), AVG(r.puntaje) FROM TicketRating r WHERE YEAR(r.fechaCreacion) = :anio GROUP BY MONTH(r.fechaCreacion)")
    List<Object[]> promedioPorMes(@Param("anio") int anio);
}
