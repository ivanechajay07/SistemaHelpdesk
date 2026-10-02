package com.empresa.helpdesk.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MfaCodeRequest {

    @NotBlank(message = "El código es requerido")
    private String code;
}
