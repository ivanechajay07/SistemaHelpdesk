package com.empresa.helpdesk.modules.ticket.controller;

import com.empresa.helpdesk.modules.ticket.dto.TemplateRequest;
import com.empresa.helpdesk.modules.ticket.dto.TemplateResponse;
import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import com.empresa.helpdesk.modules.ticket.entity.TicketTemplate;
import com.empresa.helpdesk.modules.ticket.repository.SubcategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketTemplateRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TicketTemplateRepository templateRepository;
    private final SubcategoryRepository subcategoryRepository;

    /** Lista de plantillas: disponible para todos los autenticados (se usan al crear tickets). */
    @GetMapping
    @Transactional(readOnly = true)
    public List<TemplateResponse> getAll() {
        return templateRepository.findAllByOrderByNombreAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAnyAuthority('CATEGORY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<TemplateResponse> create(@Valid @RequestBody TemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(save(null, request)));
    }

    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasAnyAuthority('CATEGORY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<TemplateResponse> update(@PathVariable Long id, @Valid @RequestBody TemplateRequest request) {
        TicketTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
        return ResponseEntity.ok(toResponse(save(template, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!templateRepository.existsById(id)) {
            throw new RuntimeException("Plantilla no encontrada");
        }
        templateRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private TicketTemplate save(TicketTemplate template, TemplateRequest request) {
        TicketTemplate t = template != null ? template : new TicketTemplate();
        t.setNombre(request.getNombre().trim());
        t.setTitulo(request.getTitulo().trim());
        t.setDescripcion(request.getDescripcion().trim());
        t.setPrioridad(request.getPrioridad().toUpperCase());
        if (request.getSubcategoriaId() != null) {
            Subcategory sub = subcategoryRepository.findById(request.getSubcategoriaId())
                    .orElseThrow(() -> new RuntimeException("Subcategoría no encontrada"));
            t.setSubcategoria(sub);
        } else {
            t.setSubcategoria(null);
        }
        return templateRepository.save(t);
    }

    /** Mapea la entidad a un DTO plano (dentro de la transacción para poder leer la relación LAZY). */
    private TemplateResponse toResponse(TicketTemplate t) {
        Subcategory sub = t.getSubcategoria();
        return TemplateResponse.builder()
                .id(t.getId())
                .nombre(t.getNombre())
                .titulo(t.getTitulo())
                .descripcion(t.getDescripcion())
                .prioridad(t.getPrioridad())
                .subcategoriaId(sub != null ? sub.getId() : null)
                .subcategoriaNombre(sub != null ? sub.getName() : null)
                .categoriaNombre(sub != null && sub.getCategory() != null ? sub.getCategory().getName() : null)
                .build();
    }
}
