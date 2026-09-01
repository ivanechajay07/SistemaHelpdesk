package com.empresa.helpdesk.modules.inventario.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardInventarioResponse {
    private long totalActivos;
    private long operativos;
    private long enMantenimiento;
    private long enReparacion;
    private long prestados;
    private long enTransito;
    private long dadosDeBaja;
    private long sinResponsable;
    private long sinUbicacion;
    private long garantiasPorVencer;
    private long garantiasVencidas;

    private long mantenimientosProximos;
    private long mantenimientosVencidos;
    private long prestamosVencidos;
    private long transferenciasPendientes;

    private List<Map<String, Object>> porEstado;
    private List<Map<String, Object>> porEntidad;
    private List<Map<String, Object>> porSede;
    private List<Map<String, Object>> porCategoria;
    private List<Map<String, Object>> movimientosPorMes;
    private List<Map<String, Object>> movimientosPorTipo;
}
