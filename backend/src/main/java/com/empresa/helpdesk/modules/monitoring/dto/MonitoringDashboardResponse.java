package com.empresa.helpdesk.modules.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
public class MonitoringDashboardResponse {

    private long totalIncidencias;
    private long abiertas;
    private long resueltas;
    /** Duración promedio de resolución en minutos (null si no hay resueltas). */
    private Double duracionPromedioMin;

    private List<SerieItem> porDia;
    private List<SerieItem> porMes;
    private List<SerieItem> porAnio;
    private List<SerieItem> porObjetivo;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SerieItem {
        private String name;
        private long value;
    }
}
