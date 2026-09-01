package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.inventario.dto.DashboardInventarioResponse;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import com.empresa.helpdesk.modules.inventario.enums.PrestamoEstado;
import com.empresa.helpdesk.modules.inventario.enums.TransferenciaEstado;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.MantenimientoRepository;
import com.empresa.helpdesk.modules.inventario.repository.MovimientoRepository;
import com.empresa.helpdesk.modules.inventario.repository.PrestamoRepository;
import com.empresa.helpdesk.modules.inventario.repository.TransferenciaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InventarioDashboardService {

    private final ActivoRepository activoRepository;
    private final MantenimientoRepository mantenimientoRepository;
    private final PrestamoRepository prestamoRepository;
    private final TransferenciaRepository transferenciaRepository;
    private final MovimientoRepository movimientoRepository;

    @Transactional(readOnly = true)
    public DashboardInventarioResponse resumen() {
        LocalDate hoy = LocalDate.now();
        LocalDate en30 = hoy.plusDays(30);
        LocalDateTime hace12Meses = LocalDateTime.now().minusMonths(12);

        return DashboardInventarioResponse.builder()
                .totalActivos(activoRepository.count())
                .operativos(activoRepository.countByEstado(ActivoEstado.OPERATIVO))
                .enMantenimiento(activoRepository.countByEstado(ActivoEstado.EN_MANTENIMIENTO))
                .enReparacion(activoRepository.countByEstado(ActivoEstado.EN_REPARACION))
                .prestados(activoRepository.countByEstado(ActivoEstado.PRESTADO))
                .enTransito(activoRepository.countByEstado(ActivoEstado.EN_TRANSITO))
                .dadosDeBaja(activoRepository.countByEstado(ActivoEstado.DADO_DE_BAJA))
                .sinResponsable(activoRepository.countByResponsableIsNull())
                .sinUbicacion(activoRepository.countBySedeIsNull())
                .garantiasPorVencer(activoRepository.countGarantiasPorVencer(hoy, en30))
                .garantiasVencidas(activoRepository.countGarantiasVencidas(hoy))
                .mantenimientosProximos(mantenimientoRepository.countProximos(hoy, en30))
                .mantenimientosVencidos(mantenimientoRepository.countVencidos(hoy))
                .prestamosVencidos(prestamoRepository.countVencidos(
                        List.of(PrestamoEstado.ENTREGADO, PrestamoEstado.VENCIDO), hoy))
                .transferenciasPendientes(transferenciaRepository.countByEstado(TransferenciaEstado.PENDIENTE_APROBACION))
                .porEstado(converts(activoRepository.countByEstadoGroup()))
                .porEntidad(converts(activoRepository.countByEntidad()))
                .porSede(converts(activoRepository.countBySede()))
                .porCategoria(converts(activoRepository.countByCategoria()))
                .movimientosPorMes(mesConCeros(movimientoRepository.countByMonth(hace12Meses)))
                .movimientosPorTipo(converts(movimientoRepository.countByTipo(hace12Meses)))
                .build();
    }

    private List<Map<String, Object>> converts(List<Object[]> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", row[0] != null ? row[0].toString() : "Sin asignar");
            m.put("value", ((Number) row[1]).longValue());
            out.add(m);
        }
        return out;
    }

    private List<Map<String, Object>> mesConCeros(List<Object[]> rows) {
        Map<Integer, Long> porMes = new HashMap<>();
        for (Object[] row : rows) {
            porMes.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }
        List<Map<String, Object>> out = new ArrayList<>();
        int mesActual = LocalDate.now().getMonthValue();
        for (int i = 0; i < 12; i++) {
            int mes = ((mesActual - 12 + i) % 12 + 12) % 12 + 1;
            out.add(Map.of("name", nombreMes(mes), "value", porMes.getOrDefault(mes, 0L)));
        }
        return out;
    }

    private String nombreMes(int mes) {
        String[] nombres = {"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"};
        return nombres[mes - 1];
    }
}
