package com.empresa.helpdesk.modules.catalog.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EntidadResponse {
    private Long id;
    private String nombre;
    private List<SedeResponse> sedes;
}