package com.empresa.helpdesk.modules.ticket.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Respuesta plana para las plantillas de tickets. Evita serializar entidades JPA
 * con relaciones LAZY (los proxies de Hibernate no son serializables por Jackson
 * y provocan errores 400 al listar o crear plantillas).
 */
@Data
@Builder
public class TemplateResponse {
    private Long id;
    private String nombre;
    private String titulo;
    private String descripcion;
    private String prioridad;
    private Long subcategoriaId;
    private String subcategoriaNombre;
    private String categoriaNombre;
}
