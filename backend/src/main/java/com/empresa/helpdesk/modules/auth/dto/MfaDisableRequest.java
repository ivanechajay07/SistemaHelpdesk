package com.empresa.helpdesk.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MfaDisableRequest {

    @NotBlank(message = "La contraseña es requerida")
    private String password;
}
