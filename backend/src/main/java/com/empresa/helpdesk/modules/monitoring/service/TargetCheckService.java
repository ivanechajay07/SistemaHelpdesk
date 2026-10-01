package com.empresa.helpdesk.modules.monitoring.service;

import com.empresa.helpdesk.modules.monitoring.entity.MonitoredTarget;
import com.empresa.helpdesk.modules.monitoring.enums.TargetStatus;
import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import com.empresa.helpdesk.modules.monitoring.repository.MonitoredTargetRepository;
import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.modules.ticket.entity.Category;
import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.entity.TicketHistory;
import com.empresa.helpdesk.modules.ticket.enums.Priority;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.CategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.SubcategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketHistoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Verifica un objetivo de monitoreo bajo bloqueo pesimista (seguro con varias
 * instancias del backend contra la misma BD) y genera tickets automáticos
 * cuando un objetivo supera el umbral de fallos.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TargetCheckService {

    private static final int TIMEOUT_MS = 5000;
    private static final String CATEGORIA_MONITOREO = "Infraestructura";
    private static final String SUBCATEGORIA_MONITOREO = "Monitoreo de Red";

    private final MonitoredTargetRepository monitoredTargetRepository;
    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository ticketHistoryRepository;
    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /** Auto-referencia (proxy) para que las llamadas internas respeten las transacciones. */
    private TargetCheckService self;

    @Autowired
    public void setSelf(@Lazy TargetCheckService self) {
        this.self = self;
    }

    /**
     * Punto de entrada NO transaccional: la verificación de red (I/O con timeouts)
     * se ejecuta FUERA de cualquier transacción, para no retener el bloqueo
     * pesimista ni una conexión del pool durante el probe.
     */
    public void checkTarget(Long targetId, boolean force) {
        MonitoredTarget target = self.beginCheck(targetId, force);
        if (target == null) {
            return;
        }

        long inicio = System.currentTimeMillis();
        boolean ok = probe(target);
        long latencia = System.currentTimeMillis() - inicio;

        self.applyResult(targetId, ok, latencia);
    }

    /** Fase 1 (transacción corta): bloquea el objetivo y decide si toca verificar. */
    @Transactional
    public MonitoredTarget beginCheck(Long targetId, boolean force) {
        MonitoredTarget target = monitoredTargetRepository.findByIdForUpdate(targetId).orElse(null);
        if (target == null) {
            return null;
        }
        if (!Boolean.TRUE.equals(target.getActivo()) && !force) {
            return null;
        }
        // Si otra instancia ya lo verificó hace poco, no repetir
        if (!force && target.getUltimoChequeo() != null
                && target.getUltimoChequeo().isAfter(LocalDateTime.now().minusSeconds(
                        target.getIntervaloSegundos() != null ? target.getIntervaloSegundos() : 60))) {
            return null;
        }
        return target;
    }

    /** Fase 2 (transacción corta): persiste el resultado del probe. */
    @Transactional
    public void applyResult(Long targetId, boolean ok, long latencia) {
        MonitoredTarget target = monitoredTargetRepository.findByIdForUpdate(targetId).orElse(null);
        if (target == null) {
            return;
        }

        target.setUltimoChequeo(LocalDateTime.now());
        target.setUltimaLatenciaMs(ok ? latencia : null);

        if (ok) {
            boolean estabaCaido = target.getUltimoEstado() == TargetStatus.DOWN;
            target.setFallosConsecutivos(0);
            target.setUltimoEstado(TargetStatus.UP);
            if (estabaCaido || target.getTicketAbiertoId() != null) {
                registrarRecuperacion(target);
            }
        } else {
            target.setFallosConsecutivos((target.getFallosConsecutivos() != null ? target.getFallosConsecutivos() : 0) + 1);
            target.setUltimoEstado(TargetStatus.DOWN);
            if (target.getTicketAbiertoId() == null
                    && target.getFallosConsecutivos() >= (target.getUmbralFallos() != null ? target.getUmbralFallos() : 3)) {
                try {
                    // Transacción independiente: un fallo al crear el ticket no
                    // marca rollback-only la transacción del resultado.
                    target.setTicketAbiertoId(self.crearTicketAutomatico(target));
                } catch (Exception ex) {
                    log.error("No se pudo generar el ticket automático para el objetivo {}: {}",
                            target.getNombre(), ex.getMessage());
                }
            }
        }

        monitoredTargetRepository.save(target);
    }

    private boolean probe(MonitoredTarget target) {
        try {
            if (target.getTipo() == TargetType.HTTP) {
                return probeHttp(target.getHost());
            } else if (target.getTipo() == TargetType.TCP) {
                if (target.getPuerto() == null) return false;
                return probeTcp(target.getHost(), target.getPuerto());
            }
            return false;
        } catch (Exception ex) {
            log.debug("Fallo de verificación para {}: {}", target.getNombre(), ex.getMessage());
            return false;
        }
    }

    private boolean probeHttp(String url) throws Exception {
        String finalUrl = url.startsWith("http://") || url.startsWith("https://") ? url : "http://" + url;
        URI uri = URI.create(finalUrl);

        // Protección SSRF: solo http/https y hosts públicos (sin loopback,
        // link-local como 169.254.169.254, rangos privados ni multicast).
        if (!urlSegura(uri)) {
            log.warn("Verificación HTTP bloqueada por protección SSRF hacia: {}", safeLogValue(finalUrl));
            return false;
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(TIMEOUT_MS))
                // Sin redirecciones: evita saltar a destinos internos tras una redirección
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofMillis(TIMEOUT_MS))
                .GET()
                .build();
        HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
        return response.statusCode() < 400;
    }

    /** Valida que el URI use http/https y que el host resuelva a direcciones públicas. */
    private boolean urlSegura(URI uri) {
        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            return false;
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return false;
        }
        try {
            for (InetAddress addr : InetAddress.getAllByName(host)) {
                if (addr.isAnyLocalAddress()
                        || addr.isLoopbackAddress()
                        || addr.isLinkLocalAddress()
                        || addr.isSiteLocalAddress()
                        || addr.isMulticastAddress()) {
                    return false;
                }
            }
        } catch (UnknownHostException ex) {
            return false;
        }
        return true;
    }

    private String safeLogValue(String value) {
        return value.replaceAll("[\\r\\n]", " ");
    }

    private boolean probeTcp(String host, int puerto) throws Exception {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, puerto), TIMEOUT_MS);
            return socket.isConnected();
        }
    }

    private void registrarRecuperacion(MonitoredTarget target) {
        if (target.getTicketAbiertoId() == null) return;
        try {
            Ticket ticket = ticketRepository.findById(target.getTicketAbiertoId()).orElse(null);
            if (ticket != null) {
                User sistema = primerAdmin();
                String hora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
                TicketHistory history = TicketHistory.builder()
                        .ticket(ticket)
                        .usuario(sistema)
                        .accion("RECUPERACION")
                        .detalle("El monitoreo detectó la recuperación del servicio '" + target.getNombre()
                                + "' (" + destinoLegible(target) + ") a las " + hora + ".")
                        .build();
                ticketHistoryRepository.save(history);
            }
        } catch (Exception ex) {
            log.error("No se pudo registrar la recuperación del objetivo {}: {}", target.getNombre(), ex.getMessage());
        } finally {
            target.setTicketAbiertoId(null);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Long crearTicketAutomatico(MonitoredTarget target) {
        User solicitante = primerAdmin();
        Subcategory subcategoria = asegurarSubcategoriaMonitoreo();

        String hora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        Ticket ticket = Ticket.builder()
                .codigo(generateTicketCode())
                .titulo("[AUTO] Sin respuesta: " + target.getNombre())
                .descripcion("Ticket generado automáticamente por el módulo de monitoreo de red.\n\n"
                        + "Objetivo: " + target.getNombre() + "\n"
                        + "Destino: " + destinoLegible(target) + "\n"
                        + "Tipo de verificación: " + target.getTipo() + "\n"
                        + "Fallos consecutivos: " + target.getFallosConsecutivos() + "\n"
                        + "Detectado: " + hora + "\n\n"
                        + "El servicio no ha respondido durante varios intentos consecutivos. "
                        + "Se recomienda revisar la disponibilidad del equipo/servicio.")
                .prioridad(Priority.CRITICA)
                .estado(TicketStatus.NUEVO)
                .subcategoria(subcategoria)
                .solicitante(solicitante)
                .build();

        ticket = ticketRepository.save(ticket);

        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(solicitante)
                .accion("CREACION_AUTOMATICA")
                .detalle("Ticket creado automáticamente por el monitoreo de red al superar el umbral de "
                        + target.getUmbralFallos() + " fallos consecutivos.")
                .build();
        ticketHistoryRepository.save(history);

        // Precargar asociaciones lazy antes de los correos asíncronos
        ticket.getSubcategoria().getCategory().getName();
        ticket.getSolicitante().getNombre();

        List<User> admins = userRepository.findByRoles_Name("ADMIN");
        for (User admin : admins) {
            emailService.sendTicketCreatedAdminNotification(admin.getEmail(), ticket);
        }

        log.warn("Ticket automático {} generado por caída del objetivo {}", ticket.getCodigo(), target.getNombre());
        return ticket.getId();
    }

    private Subcategory asegurarSubcategoriaMonitoreo() {
        Category categoria = categoryRepository.findAll().stream()
                .filter(c -> c.getName() != null && c.getName().equalsIgnoreCase(CATEGORIA_MONITOREO))
                .findFirst()
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(CATEGORIA_MONITOREO)
                        .description("Incidentes de infraestructura generados por el monitoreo de red")
                        .active(true)
                        .build()));

        return subcategoryRepository.findAll().stream()
                .filter(s -> s.getCategory() != null && s.getCategory().getId().equals(categoria.getId())
                        && s.getName() != null && s.getName().equalsIgnoreCase(SUBCATEGORIA_MONITOREO))
                .findFirst()
                .orElseGet(() -> subcategoryRepository.save(Subcategory.builder()
                        .name(SUBCATEGORIA_MONITOREO)
                        .active(true)
                        .category(categoria)
                        .build()));
    }

    private User primerAdmin() {
        return userRepository.findByRoles_Name("ADMIN").stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No existe un usuario ADMIN para los tickets automáticos"));
    }

    private String destinoLegible(MonitoredTarget target) {
        return target.getTipo() == TargetType.TCP
                ? target.getHost() + ":" + target.getPuerto()
                : target.getHost();
    }

    private String generateTicketCode() {
        String year = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy"));
        String shortUuid = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "TK-" + year + "-" + shortUuid;
    }
}
