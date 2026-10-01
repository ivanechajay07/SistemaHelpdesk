package com.empresa.helpdesk.modules.acta.controller;

import com.empresa.helpdesk.modules.acta.dto.ActaRequest;
import com.empresa.helpdesk.modules.acta.dto.ActaResponse;
import com.empresa.helpdesk.modules.acta.service.ActaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Acta de Conformidad", description = "Acta firmada por el solicitante y el técnico responsable al cierre de un ticket")
public class ActaController {

    private final ActaService actaService;

    @GetMapping("/actas")
    @Operation(summary = "Listar las actas de conformidad según el rol del usuario")
    public ResponseEntity<List<ActaResponse>> getActas() {
        return ResponseEntity.ok(actaService.getAllActas());
    }

    @GetMapping("/tickets/{ticketId}/acta")
    @Operation(summary = "Obtener el acta de conformidad de un ticket")
    public ResponseEntity<ActaResponse> getActa(@PathVariable Long ticketId) {
        return actaService.getActaByTicket(ticketId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tickets/{ticketId}/acta")
    @Operation(summary = "Registrar el acta de conformidad (solo RESUELTO/CERRADO, una por ticket)")
    public ResponseEntity<ActaResponse> createActa(@PathVariable Long ticketId,
                                                   @Valid @RequestBody ActaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(actaService.createActa(ticketId, request));
    }
}