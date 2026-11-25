package com.empresa.helpdesk.modules.push.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DeviceTokenRequest {

    @NotBlank(message = "El token del dispositivo es obligatorio")
    @Size(max = 512, message = "El token es demasiado largo")
    private String token;

    @Size(max = 20, message = "La plataforma es demasiado larga")
    private String platform;
}
