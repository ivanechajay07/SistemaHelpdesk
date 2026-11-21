package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.ticket.dto.TemplateRequest;
import com.empresa.helpdesk.modules.ticket.dto.TemplateResponse;
import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import com.empresa.helpdesk.modules.ticket.entity.TicketTemplate;
import com.empresa.helpdesk.modules.ticket.repository.SubcategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Reglas de negocio de las plantillas de tickets. El controlador solo adapta HTTP.
 */
@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TicketTemplateRepository templateRepository;
    private final SubcategoryRepository subcategoryRepository;

    @Transactional(readOnly = true)
    public List<TemplateResponse> getAll() {
        return templateRepository.findAllByOrderByNombreAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TemplateResponse create(TemplateRequest request) {
        return toResponse(save(null, request));
    }

    @Transactional
    public TemplateResponse update(Long id, TemplateRequest request) {
        TicketTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
        return toResponse(save(template, request));
    }

    @Transactional
    public void delete(Long id) {
        if (!templateRepository.existsById(id)) {
            throw new RuntimeException("Plantilla no encontrada");
        }
        templateRepository.deleteById(id);
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
