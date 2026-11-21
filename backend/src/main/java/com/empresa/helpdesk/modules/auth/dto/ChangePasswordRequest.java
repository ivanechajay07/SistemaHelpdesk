package com.empresa.helpdesk.modules.auth.dto;

import com.empresa.helpdesk.security.PasswordPolicy;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "La contraseña actual es obligatoria")
    private String currentPassword;

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, max = 12, message = "La contraseña debe tener entre 8 y 12 caracteres")
    @Pattern(regexp = PasswordPolicy.REGEX,
            message = PasswordPolicy.MESSAGE)
    private String newPassword;
}
