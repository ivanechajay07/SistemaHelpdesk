package com.empresa.helpdesk.modules.correo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CorreoRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre no puede exceder 100 caracteres")
    private String nombre;

    @NotBlank(message = "Los apellidos son obligatorios")
    @Size(max = 100, message = "Los apellidos no pueden exceder 100 caracteres")
    private String apellidos;

    @NotBlank(message = "El cargo es obligatorio")
    @Size(max = 150, message = "El cargo no puede exceder 150 caracteres")
    private String cargo;

    @NotBlank(message = "La empresa es obligatoria")
    @Size(max = 150, message = "La empresa no puede exceder 150 caracteres")
    private String empresa;

    @NotEmpty(message = "Debe registrar al menos un correo")
    @Valid
    private List<CuentaCorreoRequest> cuentas;
}