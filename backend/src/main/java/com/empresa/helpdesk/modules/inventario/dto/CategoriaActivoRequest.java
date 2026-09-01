package com.empresa.helpdesk.modules.inventario.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CategoriaActivoRequest {
    private String nombre;
    private String descripcion;
    private List<String> campos = new ArrayList<>();
}
