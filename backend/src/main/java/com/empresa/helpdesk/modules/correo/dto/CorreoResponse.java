package com.empresa.helpdesk.modules.correo.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CorreoResponse {
    private Long id;
    private String nombre;
    private String apellidos;
    private String cargo;
    private String empresa;
    /** Cuentas de correo SIN contraseña (solo indican si tienen una guardada). */
    private List<CuentaResponse> cuentas;
}