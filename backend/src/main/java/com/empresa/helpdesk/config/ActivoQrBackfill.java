package com.empresa.helpdesk.config;

import com.empresa.helpdesk.modules.inventario.service.ActivoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Garantiza que todos los activos del inventario tengan un token QR.
 * Si un activo fue creado antes de incorporar la función QR (qr_token nulo),
 * al arrancar se le genera uno para que su código QR pueda escanearse.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ActivoQrBackfill implements CommandLineRunner {

    private final ActivoService activoService;

    @Override
    public void run(String... args) {
        try {
            int generados = activoService.asignarQrFaltantes();
            if (generados > 0) {
                log.info("Se generaron {} tokens QR faltantes en el inventario", generados);
            }
        } catch (Exception e) {
            log.warn("No se pudieron generar los tokens QR faltantes: {}", e.getMessage());
        }
    }
}
