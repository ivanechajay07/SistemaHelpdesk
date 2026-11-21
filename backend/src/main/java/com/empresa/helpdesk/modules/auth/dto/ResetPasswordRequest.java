package com.empresa.helpdesk.modules.auth.dto;

import com.empresa.helpdesk.security.PasswordPolicy;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "El token es requerido")
    private String token;

    @NotBlank(message = "La contraseña es requerida")
    @Size(min = 8, max = 12, message = "La contraseña debe tener entre 8 y 12 caracteres")
    @Pattern(regexp = PasswordPolicy.REGEX,
            message = PasswordPolicy.MESSAGE)
    private String newPassword;
}
