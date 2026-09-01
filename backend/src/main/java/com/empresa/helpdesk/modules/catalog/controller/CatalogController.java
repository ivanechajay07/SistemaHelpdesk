package com.empresa.helpdesk.modules.catalog.controller;

import com.empresa.helpdesk.modules.catalog.dto.SedeRequest;
import com.empresa.helpdesk.modules.catalog.dto.SedeResponse;
import com.empresa.helpdesk.modules.catalog.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/catalog")
@RequiredArgsConstructor
@Tag(name = "Catálogo", description = "Entidades y sedes de la organización")
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/sedes")
    @Operation(summary = "Listar todas las sedes con su entidad")
    public ResponseEntity<List<SedeResponse>> getSedes() {
        return ResponseEntity.ok(catalogService.getSedes());
    }

    @GetMapping("/entidades")
    @Operation(summary = "Listar los nombres de las entidades registradas")
    public ResponseEntity<List<String>> getEntidades() {
        return ResponseEntity.ok(catalogService.getEntidades());
    }

    @PostMapping("/sedes")
    @PreAuthorize("hasAnyAuthority('ENTITY_MANAGE', 'ROLE_ADMIN')")
    @Operation(summary = "Registrar una sede (crea la entidad si no existe)")
    public ResponseEntity<SedeResponse> createSede(@Valid @RequestBody SedeRequest request) {
        return ResponseEntity.ok(catalogService.createSede(request));
    }

    @PutMapping("/sedes/{id}")
    @PreAuthorize("hasAnyAuthority('ENTITY_MANAGE', 'ROLE_ADMIN')")
    @Operation(summary = "Actualizar una sede")
    public ResponseEntity<SedeResponse> updateSede(@PathVariable Long id, @Valid @RequestBody SedeRequest request) {
        return ResponseEntity.ok(catalogService.updateSede(id, request));
    }

    @DeleteMapping("/sedes/{id}")
    @PreAuthorize("hasAnyAuthority('ENTITY_MANAGE', 'ROLE_ADMIN')")
    @Operation(summary = "Eliminar una sede")
    public ResponseEntity<Map<String, String>> deleteSede(@PathVariable Long id) {
        catalogService.deleteSede(id);
        return ResponseEntity.ok(Map.of("message", "Sede eliminada correctamente"));
    }
}
