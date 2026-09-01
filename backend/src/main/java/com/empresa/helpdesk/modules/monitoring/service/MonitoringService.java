package com.empresa.helpdesk.modules.monitoring.service;

import com.empresa.helpdesk.modules.monitoring.dto.MonitoredTargetRequest;
import com.empresa.helpdesk.modules.monitoring.dto.MonitoredTargetResponse;
import com.empresa.helpdesk.modules.monitoring.entity.MonitoredTarget;
import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import com.empresa.helpdesk.modules.monitoring.repository.MonitoredTargetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MonitoringService {

    private final MonitoredTargetRepository monitoredTargetRepository;
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
