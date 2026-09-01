package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.CategoriaActivoRequest;
import com.empresa.helpdesk.modules.inventario.service.CategoriaActivoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventario/categorias")
@RequiredArgsConstructor
@Tag(name = "Inventario - Categorías de activos", description = "Categorías configurables de activos")
public class CategoriaActivoController {

    private final CategoriaActivoService categoriaService;

    @GetMapping
    @Operation(summary = "Listar categorías de activos")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'ROLE_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listar() {
        return ResponseEntity.ok(categoriaService.listar());
    }

    @PostMapping
    @Operation(summary = "Crear categoría de activo")
    @PreAuthorize("hasAnyAuthority('INV_EDIT', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> crear(@RequestBody CategoriaActivoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crear(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar categoría de activo")
    @PreAuthorize("hasAnyAuthority('INV_EDIT', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> actualizar(@PathVariable Long id, @RequestBody CategoriaActivoRequest request) {
        return ResponseEntity.ok(categoriaService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar categoría de activo")
    @PreAuthorize("hasAnyAuthority('INV_DELETE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        categoriaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
