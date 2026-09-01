package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.ActivoRequest;
import com.empresa.helpdesk.modules.inventario.dto.ActivoResponse;
import com.empresa.helpdesk.modules.inventario.dto.TicketAsociadoResponse;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import com.empresa.helpdesk.modules.inventario.repository.ActivoTicketRepository;
import com.empresa.helpdesk.modules.inventario.service.ActivoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventario/activos")
@RequiredArgsConstructor
@Tag(name = "Inventario - Activos", description = "Gestión de activos del inventario")
public class ActivoController {

    private final ActivoService activoService;
    private final ActivoTicketRepository activoTicketRepository;

    @GetMapping
    @Operation(summary = "Buscar activos con filtros")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'ROLE_ADMIN')")
    public ResponseEntity<Page<ActivoResponse>> buscar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ActivoEstado estado,
            @RequestParam(required = false) Long entidadId,
            @RequestParam(required = false) Long sedeId,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "desc") String dir) {
        Sort sortObj = Sort.by(Sort.Direction.fromString(dir), sort);
        Pageable pageable = PageRequest.of(page, size, sortObj);
        return ResponseEntity.ok(activoService.buscar(q, estado, entidadId, sedeId, categoriaId, responsableId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener activo por id (con especificaciones)")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'ROLE_ADMIN')")
    public ResponseEntity<ActivoResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(activoService.obtenerConEspecificaciones(id));
    }

    @GetMapping("/qr/{qrToken}")
    @Operation(summary = "Consultar activo por QR (público)", description = "Acceso público sin autenticación: devuelve los datos básicos del activo al escanear su QR")
    public ResponseEntity<Map<String, Object>> obtenerPorQr(@PathVariable String qrToken) {
        return ResponseEntity.ok(activoService.obtenerPorQrPublico(qrToken));
    }

    @PostMapping
    @Operation(summary = "Registrar nuevo activo")
    @PreAuthorize("hasAnyAuthority('INV_CREATE', 'ROLE_ADMIN')")
    public ResponseEntity<ActivoResponse> crear(@Valid @RequestBody ActivoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activoService.crear(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar activo")
    @PreAuthorize("hasAnyAuthority('INV_EDIT', 'ROLE_ADMIN')")
    public ResponseEntity<ActivoResponse> actualizar(@PathVariable Long id, @Valid @RequestBody ActivoRequest request) {
        return ResponseEntity.ok(activoService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar activo")
    @PreAuthorize("hasAnyAuthority('INV_DELETE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        activoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/baja")
    @Operation(summary = "Dar de baja un activo")
    @PreAuthorize("hasAnyAuthority('INV_BAJA', 'ROLE_ADMIN')")
    public ResponseEntity<ActivoResponse> darDeBaja(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        return ResponseEntity.ok(activoService.darDeBaja(id, motivo));
    }

    @PostMapping("/{id}/qr")
    @Operation(summary = "Generar token QR para el activo")
    @PreAuthorize("hasAnyAuthority('INV_QR', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, String>> generarQr(@PathVariable Long id) {
        String token = activoService.generarQr(id);
        return ResponseEntity.ok(Map.of("qrToken", token));
    }

    @GetMapping("/{id}/tickets")
    @Operation(summary = "Tickets asociados al activo")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'ROLE_ADMIN')")
    public ResponseEntity<List<TicketAsociadoResponse>> ticketsAsociados(@PathVariable Long id) {
        List<TicketAsociadoResponse> tickets = activoTicketRepository.findByActivoIdOrderByFechaCreacionDesc(id)
                .stream().map(at -> TicketAsociadoResponse.builder()
                        .id(at.getTicket().getId())
                        .codigo(at.getTicket().getCodigo())
                        .titulo(at.getTicket().getTitulo())
                        .categoria(at.getTicket().getSubcategoria() != null && at.getTicket().getSubcategoria().getCategory() != null
                                ? at.getTicket().getSubcategoria().getCategory().getName() : null)
                        .estado(at.getTicket().getEstado() != null ? at.getTicket().getEstado().name() : null)
                        .prioridad(at.getTicket().getPrioridad() != null ? at.getTicket().getPrioridad().name() : null)
                        .fechaCreacion(at.getFechaCreacion())
                        .tecnicoNombre(at.getTicket().getTecnico() != null
                                ? at.getTicket().getTecnico().getNombre() + " " + (at.getTicket().getTecnico().getApellidos() == null ? "" : at.getTicket().getTecnico().getApellidos())
                                : null)
                        .build())
                .toList();
        return ResponseEntity.ok(tickets);
    }
}
