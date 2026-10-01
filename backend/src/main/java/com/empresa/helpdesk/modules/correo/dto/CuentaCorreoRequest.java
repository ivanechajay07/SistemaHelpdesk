package com.empresa.helpdesk.modules.correo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CuentaCorreoRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Formato de correo inválido")
    @Size(max = 200, message = "El correo no puede exceder 200 caracteres")
    private String email;

    @NotBlank(message = "La contraseña del correo es obligatoria")
    @Size(max = 200, message = "La contraseña no puede exceder 200 caracteres")
    private String password;
}