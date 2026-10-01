package com.empresa.helpdesk.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter en memoria por clave (ej. IP o usuario).
 * Ventana deslizante simple: permite N intentos por ventana de tiempo.
 */
@Service
public class RateLimiterService {

    private final Map<String, Deque<Instant>> intentos = new ConcurrentHashMap<>();

    /**
     * Registra un intento y lanza {@link RateLimitException} si se supera el límite.
     *
     * @param clave          identificador único (ej. "login:192.168.1.1:admin")
     * @param maxIntentos    máximo de intentos dentro de la ventana
     * @param ventanaSegundos tamaño de la ventana en segundos
     */
    public void verificar(String clave, int maxIntentos, int ventanaSegundos) {
        Instant ahora = Instant.now();
        Deque<Instant> cola = intentos.computeIfAbsent(clave, k -> new ArrayDeque<>());

        synchronized (cola) {
            // Descartar intentos fuera de la ventana
            while (!cola.isEmpty() && cola.peekFirst().isBefore(ahora.minusSeconds(ventanaSegundos))) {
                cola.pollFirst();
            }
            if (cola.size() >= maxIntentos) {
                throw new RateLimitException(
                        "Demasiados intentos. Espera " + ventanaSegundos + " segundos antes de volver a intentar.");
            }
            cola.addLast(ahora);
        }
    }

    /** Limpia los intentos de una clave (ej. tras un login exitoso). */
    public void resetear(String clave) {
        Deque<Instant> cola = intentos.get(clave);
        if (cola != null) {
            synchronized (cola) {
                cola.clear();
            }
            intentos.remove(clave);
        }
    }

    /**
     * Purga periódicamente las claves sin actividad reciente para evitar que el
     * mapa crezca indefinidamente con muchas IPs/usuarios distintos.
     */
    @Scheduled(fixedDelayString = "${app.rate-limit.cleanup-ms:600000}", initialDelay = 600000)
    public void limpiar() {
        Instant corte = Instant.now().minusSeconds(3600);
        intentos.entrySet().removeIf(entry -> {
            Deque<Instant> cola = entry.getValue();
            synchronized (cola) {
                while (!cola.isEmpty() && cola.peekFirst().isBefore(corte)) {
                    cola.pollFirst();
                }
                return cola.isEmpty();
            }
        });
    }
}
