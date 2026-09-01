package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.TransferenciaEstado;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TransferenciaResponse {
    private Long id;
    private String numeroDocumento;
    private LocalDateTime fecha;
    private Long entidadOrigenId;
    private String entidadOrigenNombre;
    private Long sedeOrigenId;
    private String sedeOrigenNombre;
    private Long entidadDestinoId;
    private String entidadDestinoNombre;
    private Long sedeDestinoId;
    private String sedeDestinoNombre;
    private Long responsableEntregaId;
    private String responsableEntregaNombre;
    private Long responsableRecibeId;
    private String responsableRecibeNombre;
    private String motivo;
    private String observaciones;
    private TransferenciaEstado estado;
    private LocalDateTime fechaRecepcion;
    private String creadoPor;
    private String pdfUrl;
    private List<ActivoResponse> activos;
}
