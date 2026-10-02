package com.empresa.helpdesk.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MfaVerifyRequest {

    @NotBlank(message = "El token temporal es requerido")
    private String mfaToken;

    @NotBlank(message = "El código es requerido")
    private String code;
}
