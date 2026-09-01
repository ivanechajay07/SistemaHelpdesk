package com.empresa.helpdesk.modules.ticket.controller;

import com.empresa.helpdesk.modules.ticket.dto.TicketCreateRequest;
import com.empresa.helpdesk.modules.ticket.dto.TicketRatingRequest;
import com.empresa.helpdesk.modules.ticket.dto.TicketResolveRequest;
import com.empresa.helpdesk.modules.ticket.dto.TicketResponse;
import com.empresa.helpdesk.modules.ticket.dto.TicketUpdateRequest;
import com.empresa.helpdesk.modules.ticket.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Endpoints para la gestión de tickets")
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    @Operation(summary = "Crear un nuevo ticket")
    public ResponseEntity<TicketResponse> createTicket(@Valid @RequestBody TicketCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.createTicket(request));
    }

    @GetMapping
    @Operation(summary = "Obtener todos los tickets (Admin/Supervisor)")
    public ResponseEntity<Page<TicketResponse>> getAllTickets(Pageable pageable) {
        return ResponseEntity.ok(ticketService.getAllTickets(pageable));
    }
    
    @GetMapping("/me")
    @Operation(summary = "Obtener los tickets creados por el usuario actual")
    public ResponseEntity<Page<TicketResponse>> getMyTickets(Pageable pageable) {
        return ResponseEntity.ok(ticketService.getMyTickets(pageable));
    }

    @GetMapping("/assigned")
    @Operation(summary = "Obtener tickets asignados al técnico actual")
    public ResponseEntity<Page<TicketResponse>> getAssignedTickets(Pageable pageable) {
        return ResponseEntity.ok(ticketService.getAssignedTickets(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener un ticket por ID (verificación de acceso)")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_EDIT')")
    @Operation(summary = "Actualizar un ticket existente (requiere permiso TICKET_EDIT; el técnico no puede editar)")
    public ResponseEntity<TicketResponse> updateTicket(@PathVariable Long id, @Valid @RequestBody TicketUpdateRequest request) {
        return ResponseEntity.ok(ticketService.updateTicket(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_DELETE')")
    @Operation(summary = "Eliminar un ticket por ID (requiere permiso TICKET_DELETE, administrable por el admin)")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/assign/{tecnicoId}")
    @Operation(summary = "Asignar un técnico a un ticket (Supervisor/Admin)")
    public ResponseEntity<TicketResponse> assignTicket(
            @PathVariable Long id,
            @PathVariable Long tecnicoId
    ) {
        return ResponseEntity.ok(ticketService.assignTicket(id, tecnicoId));
    }

    @PutMapping("/{id}/resolve")
    @Operation(summary = "Resolver ticket (solo técnico asignado o admin). Queda pendiente de confirmación del cliente")
    public ResponseEntity<TicketResponse> resolveTicket(@PathVariable Long id, @Valid @RequestBody TicketResolveRequest request) {
        return ResponseEntity.ok(ticketService.resolveTicket(id, request));
    }

    @PutMapping("/{id}/confirm")
    @Operation(summary = "El cliente confirma la solución y cierra el ticket (notifica al admin)")
    public ResponseEntity<TicketResponse> confirmTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.confirmTicket(id));
    }

    @PutMapping("/{id}/reactivate")
    @Operation(summary = "Reactivar un ticket cerrado (cambia el estado a EN_REVISION y habilita el chat)")
    public ResponseEntity<TicketResponse> reactivateTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.reactivateTicket(id));
    }

    @PostMapping("/{id}/rating")
    @Operation(summary = "Calificar ticket cerrado (encuesta de satisfacción CSAT)")
    public ResponseEntity<TicketResponse> rateTicket(
            @PathVariable Long id,
            @Valid @RequestBody TicketRatingRequest request
    ) {
        return ResponseEntity.ok(ticketService.rateTicket(id, request));
    }
}
