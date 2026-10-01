package com.empresa.helpdesk.modules.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO reducido para listados de selección (p. ej. técnicos asignables).
 * No expone datos personales sensibles como email, teléfono, dirección,
 * IP ni información de dispositivo/conexión.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private Long id;
    private String username;
    private String nombre;
    private String apellidos;
}
