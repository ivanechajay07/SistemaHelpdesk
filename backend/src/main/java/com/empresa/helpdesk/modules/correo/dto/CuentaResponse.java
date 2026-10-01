package com.empresa.helpdesk.modules.correo.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CuentaResponse {
    private Long id;
    private String email;
    /** Indica si la cuenta tiene contraseña guardada (el valor nunca viaja en el listado). */
    private boolean tienePassword;
}