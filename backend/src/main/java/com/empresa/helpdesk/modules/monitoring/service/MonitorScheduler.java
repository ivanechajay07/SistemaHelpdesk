package com.empresa.helpdesk.modules.monitoring.service;

import com.empresa.helpdesk.modules.monitoring.entity.MonitoredTarget;
import com.empresa.helpdesk.modules.monitoring.repository.MonitoredTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Ciclo principal del monitoreo: cada 15 segundos revisa qué objetivos activos
 * cumplieron su intervalo y los verifica individualmente (con bloqueo pesimista).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MonitorScheduler {

    private final MonitoredTargetRepository monitoredTargetRepository;
    private final TargetCheckService targetCheckService;

    @Scheduled(fixedDelayString = "${app.monitoring.check-loop-ms:15000}", initialDelay = 20000)
    public void runChecks() {
        LocalDateTime ahora = LocalDateTime.now();
        for (MonitoredTarget target : monitoredTargetRepository.findByActivoTrue()) {
            boolean vencido = target.getUltimoChequeo() == null
                    || target.getUltimoChequeo().isBefore(ahora.minusSeconds(
                            target.getIntervaloSegundos() != null ? target.getIntervaloSegundos() : 60));
            if (!vencido) continue;
            try {
                targetCheckService.checkTarget(target.getId(), false);
            } catch (Exception ex) {
                log.error("Error verificando el objetivo {}: {}", target.getNombre(), ex.getMessage());
            }
        }
    }
}
