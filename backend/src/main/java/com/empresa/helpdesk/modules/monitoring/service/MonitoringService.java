package com.empresa.helpdesk.modules.monitoring.service;

import com.empresa.helpdesk.modules.monitoring.dto.MonitoredTargetRequest;
import com.empresa.helpdesk.modules.monitoring.dto.MonitoredTargetResponse;
import com.empresa.helpdesk.modules.monitoring.dto.MonitoringDashboardResponse;
import com.empresa.helpdesk.modules.monitoring.entity.MonitoredTarget;
import com.empresa.helpdesk.modules.monitoring.entity.MonitoringIncident;
import com.empresa.helpdesk.modules.monitoring.enums.IncidentEstado;
import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import com.empresa.helpdesk.modules.monitoring.repository.MonitoredTargetRepository;
import com.empresa.helpdesk.modules.monitoring.repository.MonitoringIncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class MonitoringService {

    private static final String[] MESES = {"Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"};

    private final MonitoredTargetRepository monitoredTargetRepository;
    private final MonitoringIncidentRepository monitoringIncidentRepository;
    private final TargetCheckService targetCheckService;

    @Transactional(readOnly = true)
    public List<MonitoredTargetResponse> getAll() {
        return monitoredTargetRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public MonitoredTargetResponse create(MonitoredTargetRequest request) {
        validarRequest(request);
        MonitoredTarget target = MonitoredTarget.builder()
                .nombre(request.getNombre().trim())
                .tipo(request.getTipo())
                .host(request.getHost().trim())
                .puerto(request.getTipo() == TargetType.TCP ? request.getPuerto() : null)
                .intervaloSegundos(request.getIntervaloSegundos() != null ? request.getIntervaloSegundos() : 60)
                .umbralFallos(request.getUmbralFallos() != null ? request.getUmbralFallos() : 3)
                .activo(request.getActivo() != null ? request.getActivo() : true)
                .build();
        return mapToResponse(monitoredTargetRepository.save(target));
    }

    @Transactional
    public MonitoredTargetResponse update(Long id, MonitoredTargetRequest request) {
        validarRequest(request);
        MonitoredTarget target = monitoredTargetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Objetivo de monitoreo no encontrado"));
        target.setNombre(request.getNombre().trim());
        target.setTipo(request.getTipo());
        target.setHost(request.getHost().trim());
        target.setPuerto(request.getTipo() == TargetType.TCP ? request.getPuerto() : null);
        target.setIntervaloSegundos(request.getIntervaloSegundos() != null ? request.getIntervaloSegundos() : 60);
        target.setUmbralFallos(request.getUmbralFallos() != null ? request.getUmbralFallos() : 3);
        if (request.getActivo() != null) {
            target.setActivo(request.getActivo());
        }
        return mapToResponse(monitoredTargetRepository.save(target));
    }

    @Transactional
    public void delete(Long id) {
        if (!monitoredTargetRepository.existsById(id)) {
            throw new RuntimeException("Objetivo de monitoreo no encontrado");
        }
        monitoredTargetRepository.deleteById(id);
    }

    /**
     * Verificación manual inmediata (ignora el intervalo). Devuelve el objetivo actualizado.
     */
    @Transactional
    public MonitoredTargetResponse checkNow(Long id) {
        targetCheckService.checkTarget(id, true);
        MonitoredTarget target = monitoredTargetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Objetivo de monitoreo no encontrado"));
        return mapToResponse(target);
    }

    /**
     * Dashboard de incidencias: totales, duración media de resolución y
     * series agregadas por día (últimos 30), mes (últimos 12), año y objetivo.
     */
    @Transactional(readOnly = true)
    public MonitoringDashboardResponse dashboard() {
        List<MonitoringIncident> all = monitoringIncidentRepository.findAllByOrderByInicioDesc();

        long total = all.size();
        long abiertas = all.stream().filter(i -> i.getEstado() == IncidentEstado.ABIERTA).count();
        long resueltas = total - abiertas;
        Double avgSegundos = monitoringIncidentRepository.avgDuracionByEstado(IncidentEstado.RESUELTA);
        Double avgMin = avgSegundos != null ? Math.round(avgSegundos / 60.0 * 10.0) / 10.0 : null;

        // Series por día (últimos 30) y mes (últimos 12), inicializadas en 0.
        java.time.LocalDate hoy = java.time.LocalDate.now();
        Map<java.time.LocalDate, Long> diaMap = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) diaMap.put(hoy.minusDays(i), 0L);

        YearMonth mesActual = YearMonth.now();
        Map<YearMonth, Long> mesMap = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) mesMap.put(mesActual.minusMonths(i), 0L);

        Map<Integer, Long> anioMap = new TreeMap<>();
        Map<String, Long> objetivoMap = new LinkedHashMap<>();

        DateTimeFormatter diaFmt = DateTimeFormatter.ofPattern("dd/MM");
        for (MonitoringIncident inc : all) {
            if (inc.getInicio() == null) continue;
            java.time.LocalDate d = inc.getInicio().toLocalDate();
            if (diaMap.containsKey(d)) diaMap.merge(d, 1L, Long::sum);
            YearMonth ym = YearMonth.from(inc.getInicio());
            if (mesMap.containsKey(ym)) mesMap.merge(ym, 1L, Long::sum);
            anioMap.merge(inc.getInicio().getYear(), 1L, Long::sum);
            String nombre = inc.getTargetNombre() != null ? inc.getTargetNombre() : "Desconocido";
            objetivoMap.merge(nombre, 1L, Long::sum);
        }

        List<MonitoringDashboardResponse.SerieItem> porDia = new ArrayList<>();
        diaMap.forEach((k, v) -> porDia.add(new MonitoringDashboardResponse.SerieItem(k.format(diaFmt), v)));

        List<MonitoringDashboardResponse.SerieItem> porMes = new ArrayList<>();
        mesMap.forEach((k, v) -> porMes.add(new MonitoringDashboardResponse.SerieItem(MESES[k.getMonthValue() - 1], v)));

        List<MonitoringDashboardResponse.SerieItem> porAnio = new ArrayList<>();
        anioMap.forEach((k, v) -> porAnio.add(new MonitoringDashboardResponse.SerieItem(String.valueOf(k), v)));

        List<MonitoringDashboardResponse.SerieItem> porObjetivo = objetivoMap.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(6)
                .map(e -> new MonitoringDashboardResponse.SerieItem(e.getKey(), e.getValue()))
                .toList();

        return MonitoringDashboardResponse.builder()
                .totalIncidencias(total)
                .abiertas(abiertas)
                .resueltas(resueltas)
                .duracionPromedioMin(avgMin)
                .porDia(porDia)
                .porMes(porMes)
                .porAnio(porAnio)
                .porObjetivo(porObjetivo)
                .build();
    }

    private void validarRequest(MonitoredTargetRequest request) {
        if (request.getTipo() == TargetType.TCP && request.getPuerto() == null) {
            throw new RuntimeException("El puerto es obligatorio para objetivos de tipo TCP");
        }
    }

    private MonitoredTargetResponse mapToResponse(MonitoredTarget t) {
        return MonitoredTargetResponse.builder()
                .id(t.getId())
                .nombre(t.getNombre())
                .tipo(t.getTipo())
                .host(t.getHost())
                .puerto(t.getPuerto())
                .intervaloSegundos(t.getIntervaloSegundos())
                .umbralFallos(t.getUmbralFallos())
                .activo(t.getActivo())
                .ultimoEstado(t.getUltimoEstado())
                .ultimaLatenciaMs(t.getUltimaLatenciaMs())
                .ultimoChequeo(t.getUltimoChequeo())
                .fallosConsecutivos(t.getFallosConsecutivos())
                .ticketAbiertoId(t.getTicketAbiertoId())
                .build();
    }
}
