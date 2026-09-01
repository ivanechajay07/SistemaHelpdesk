package com.empresa.helpdesk.modules.ticket.repository;

import com.empresa.helpdesk.modules.ticket.entity.TicketTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketTemplateRepository extends JpaRepository<TicketTemplate, Long> {

    List<TicketTemplate> findAllByOrderByNombreAsc();
}
