package com.empresa.helpdesk.modules.monitoring.dto;

import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MonitoredTargetRequest {

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 120, message = "El nombre no puede exceder 120 caracteres")
    private String nombre;

    @NotNull(message = "El tipo es requerido")
    private TargetType tipo;

    @NotBlank(message = "El host es requerido")
    @Size(max = 500, message = "El host no puede exceder 500 caracteres")
    private String host;

    @Min(value = 1, message = "El puerto debe ser mayor a 0")
    @Max(value = 65535, message = "El puerto debe ser menor a 65536")
    private Integer puerto;

    @Min(value = 30, message = "El intervalo mínimo es de 30 segundos")
    private Integer intervaloSegundos = 60;

    @Min(value = 1, message = "El umbral de fallos debe ser al menos 1")
    private Integer umbralFallos = 3;

    private Boolean activo;
}
