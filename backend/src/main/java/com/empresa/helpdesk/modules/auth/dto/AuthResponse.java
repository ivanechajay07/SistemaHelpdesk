package com.empresa.helpdesk.modules.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private Long id;
    private String username;
    private String email;
    private String nombre;
    private String apellidos;
    private List<String> roles;
    private List<String> permissions;

    /** 2FA: true cuando se requiere verificar el código TOTP para completar el login. */
    private Boolean mfaRequired;
    /** 2FA: token temporal para completar la verificación en /auth/2fa/verify. */
    private String mfaToken;
    /** 2FA: indica si la cuenta tiene la verificación en dos pasos activada. */
    private Boolean twoFactorEnabled;
}
