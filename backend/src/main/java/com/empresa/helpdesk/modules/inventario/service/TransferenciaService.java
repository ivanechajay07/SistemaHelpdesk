package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.catalog.repository.EntidadRepository;
import com.empresa.helpdesk.modules.catalog.repository.SedeRepository;
import com.empresa.helpdesk.modules.inventario.dto.ActivoResponse;
import com.empresa.helpdesk.modules.inventario.dto.TransferenciaRequest;
import com.empresa.helpdesk.modules.inventario.dto.TransferenciaResponse;
import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.entity.Movimiento;
import com.empresa.helpdesk.modules.inventario.entity.Transferencia;
import com.empresa.helpdesk.modules.inventario.enums.MovimientoTipo;
import com.empresa.helpdesk.modules.inventario.enums.TransferenciaEstado;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.MovimientoRepository;
import com.empresa.helpdesk.modules.inventario.repository.TransferenciaRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransferenciaService {

    private final TransferenciaRepository transferenciaRepository;
    private final ActivoRepository activoRepository;
    private final EntidadRepository entidadRepository;
    private final SedeRepository sedeRepository;
    private final UserRepository userRepository;
    private final MovimientoRepository movimientoRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<TransferenciaResponse> listar() {
        return transferenciaRepository.findAllByOrderByFechaDesc().stream()
                .map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public TransferenciaResponse obtener(Long id) {
        return mapToResponse(transferenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transferencia no encontrada")));
    }

    @Transactional
    public TransferenciaResponse crear(TransferenciaRequest request) {
        Transferencia t = Transferencia.builder()
                .numeroDocumento(generarNumero())
                .fecha(request.getFecha() != null ? request.getFecha() : LocalDateTime.now())
                .entidadOrigen(resolverEntidad(request.getEntidadOrigenId()))
                .sedeOrigen(resolverSede(request.getSedeOrigenId()))
                .entidadDestino(resolverEntidad(request.getEntidadDestinoId()))
                .sedeDestino(resolverSede(request.getSedeDestinoId()))
                .responsableEntrega(resolverUser(request.getResponsableEntregaId()))
                .responsableRecibe(request.getResponsableRecibeId() != null ? resolverUser(request.getResponsableRecibeId()) : null)
                .motivo(request.getMotivo())
                .observaciones(request.getObservaciones())
                .estado(TransferenciaEstado.PENDIENTE_APROBACION)
                .creadoPor(getCurrentUser())
                .build();

        List<Activo> activos = activoRepository.findAllById(request.getActivoIds());
        t.setActivos(new HashSet<>(activos));
        t = transferenciaRepository.save(t);

        auditService.registrar("CREAR_TRANSFERENCIA", "INVENTARIO", t.getId(),
                t.getNumeroDocumento() + " — " + activos.size() + " activo(s)");
        return mapToResponse(t);
    }

    /**
     * Confirma la recepción de la transferencia: actualiza la entidad/sede de
     * cada activo y registra un movimiento en el historial de cada uno.
     */
    @Transactional
    public TransferenciaResponse confirmarRecepcion(Long id) {
        Transferencia t = transferenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transferencia no encontrada"));
        if (t.getEstado() != TransferenciaEstado.PENDIENTE_APROBACION) {
            throw new RuntimeException("La transferencia ya fue " + t.getEstado().name().toLowerCase());
        }
        t.setEstado(TransferenciaEstado.RECIBIDO);
        t.setFechaRecepcion(LocalDateTime.now());
        t.setResponsableRecibe(getCurrentUser());

        // Aplicar a cada activo
        for (Activo activo : t.getActivos()) {
            activo.setEntidad(t.getEntidadDestino());
            activo.setSede(t.getSedeDestino());
            activoRepository.save(activo);

            Movimiento m = Movimiento.builder()
                    .activo(activo)
                    .tipo(MovimientoTipo.TRASLADO)
                    .entidadOrigen(t.getEntidadOrigen())
                    .sedeOrigen(t.getSedeOrigen())
                    .entidadDestino(t.getEntidadDestino())
                    .sedeDestino(t.getSedeDestino())
                    .ubicacionDestino(t.getSedeDestino() != null ? t.getSedeDestino().getNombre() : null)
                    .fecha(LocalDateTime.now())
                    .usuarioOperacion(getCurrentUser())
                    .motivo("Transferencia " + t.getNumeroDocumento())
                    .observaciones(t.getMotivo())
                    .confirmado(true)
                    .build();
            movimientoRepository.save(m);
        }

        transferenciaRepository.save(t);
        auditService.registrar("CONFIRMAR_RECEPCION", "INVENTARIO", t.getId(),
                t.getNumeroDocumento() + " recibido — " + t.getActivos().size() + " activo(s)");
        return mapToResponse(t);
    }

    @Transactional
    public TransferenciaResponse anular(Long id, String motivo) {
        Transferencia t = transferenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transferencia no encontrada"));
        if (t.getEstado() != TransferenciaEstado.PENDIENTE_APROBACION) {
            throw new RuntimeException("No se puede anular una transferencia " + t.getEstado().name().toLowerCase());
        }
        t.setEstado(TransferenciaEstado.CANCELADO);
        transferenciaRepository.save(t);
        auditService.registrar("ANULAR_TRANSFERENCIA", "INVENTARIO", t.getId(),
                t.getNumeroDocumento() + (motivo != null && !motivo.isBlank() ? ": " + motivo : ""));
        return mapToResponse(t);
    }

    private String generarNumero() {
        String base = "TRF-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        return base;
    }

    private TransferenciaResponse mapToResponse(Transferencia t) {
        return TransferenciaResponse.builder()
                .id(t.getId())
                .numeroDocumento(t.getNumeroDocumento())
                .fecha(t.getFecha())
                .entidadOrigenId(t.getEntidadOrigen() != null ? t.getEntidadOrigen().getId() : null)
                .entidadOrigenNombre(t.getEntidadOrigen() != null ? t.getEntidadOrigen().getNombre() : null)
                .sedeOrigenId(t.getSedeOrigen() != null ? t.getSedeOrigen().getId() : null)
                .sedeOrigenNombre(t.getSedeOrigen() != null ? t.getSedeOrigen().getNombre() : null)
                .entidadDestinoId(t.getEntidadDestino() != null ? t.getEntidadDestino().getId() : null)
                .entidadDestinoNombre(t.getEntidadDestino() != null ? t.getEntidadDestino().getNombre() : null)
                .sedeDestinoId(t.getSedeDestino() != null ? t.getSedeDestino().getId() : null)
                .sedeDestinoNombre(t.getSedeDestino() != null ? t.getSedeDestino().getNombre() : null)
                .responsableEntregaId(t.getResponsableEntrega() != null ? t.getResponsableEntrega().getId() : null)
                .responsableEntregaNombre(nombreCompleto(t.getResponsableEntrega()))
                .responsableRecibeId(t.getResponsableRecibe() != null ? t.getResponsableRecibe().getId() : null)
                .responsableRecibeNombre(nombreCompleto(t.getResponsableRecibe()))
                .motivo(t.getMotivo())
                .observaciones(t.getObservaciones())
                .estado(t.getEstado())
                .fechaRecepcion(t.getFechaRecepcion())
                .creadoPor(t.getCreadoPor() != null ? t.getCreadoPor().getUsername() : null)
                .pdfUrl(t.getPdfUrl())
                .activos(t.getActivos().stream()
                        .map(a -> ActivoResponse.builder()
                                .id(a.getId()).codigo(a.getCodigo()).nombre(a.getNombre())
                                .marca(a.getMarca()).modelo(a.getModelo()).numeroSerie(a.getNumeroSerie()).build())
                        .toList())
                .build();
    }

    private Entidad resolverEntidad(Long id) {
        return id != null ? entidadRepository.findById(id).orElse(null) : null;
    }

    private Sede resolverSede(Long id) {
        return id != null ? sedeRepository.findById(id).orElse(null) : null;
    }

    private User resolverUser(Long id) {
        return id != null ? userRepository.findById(id).orElse(null) : null;
    }

    private String nombreCompleto(User u) {
        if (u == null) return null;
        return ((u.getNombre() == null ? "" : u.getNombre()) + " " + (u.getApellidos() == null ? "" : u.getApellidos())).trim();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }
}
