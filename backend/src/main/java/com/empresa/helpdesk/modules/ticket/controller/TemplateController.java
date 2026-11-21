package com.empresa.helpdesk.modules.ticket.controller;

import com.empresa.helpdesk.modules.ticket.dto.TemplateRequest;
import com.empresa.helpdesk.modules.ticket.dto.TemplateResponse;
import com.empresa.helpdesk.modules.ticket.service.TemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Adaptador HTTP de plantillas. La lógica está en {@link TemplateService}.
 */
@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    /** Lista de plantillas: disponible para todos los autenticados (se usan al crear tickets). */
    @GetMapping
    public List<TemplateResponse> getAll() {
        return templateService.getAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('CATEGORY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<TemplateResponse> create(@Valid @RequestBody TemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<TemplateResponse> update(@PathVariable Long id,
                                                   @Valid @RequestBody TemplateRequest request) {
        return ResponseEntity.ok(templateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        templateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
