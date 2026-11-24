package com.empresa.helpdesk.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class MfaSetupCompleteRequest {

    @NotBlank(message = "El token de configuración es obligatorio")
    private String mfaSetupToken;

    @NotBlank(message = "El código es obligatorio")
    @Pattern(regexp = "\\d{6}", message = "El código debe tener 6 dígitos")
    private String code;
}
