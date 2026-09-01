package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.catalog.repository.EntidadRepository;
import com.empresa.helpdesk.modules.catalog.repository.SedeRepository;
import com.empresa.helpdesk.modules.inventario.dto.MovimientoRequest;
import com.empresa.helpdesk.modules.inventario.dto.MovimientoResponse;
import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.entity.Movimiento;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.MovimientoRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MovimientoService {

    private final MovimientoRepository movimientoRepository;
    private final ActivoRepository activoRepository;
    private final EntidadRepository entidadRepository;
    private final SedeRepository sedeRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<MovimientoResponse> listar(Long activoId, Pageable pageable) {
        Page<Movimiento> page = activoId != null
                ? movimientoRepository.findByActivoId(activoId, pageable)
                : movimientoRepository.findAllByOrderByFechaDesc(pageable);
        return page.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<MovimientoResponse> listarPorActivo(Long activoId) {
        return movimientoRepository.findByActivoIdOrderByFechaDesc(activoId).stream()
                .map(this::mapToResponse).toList();
    }

    /**
     * Registra un movimiento. Si {@code aplicar=true}, actualiza también la
     * ubicación/responsable actual del activo (y cambia su estado a EN_TRANSITO si aplica).
     */
    @Transactional
    public MovimientoResponse registrar(MovimientoRequest request) {
        Activo activo = activoRepository.findById(request.getActivoId())
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));

        Entidad entidadOrigen = resolverEntidad(request.getEntidadOrigenId());
        Sede sedeOrigen = resolverSede(request.getSedeOrigenId());
        Entidad entidadDestino = resolverEntidad(request.getEntidadDestinoId());
        Sede sedeDestino = resolverSede(request.getSedeDestinoId());
        User respAnterior = resolverUser(request.getResponsableAnteriorId());
        User respNuevo = resolverUser(request.getResponsableNuevoId());

        Movimiento movimiento = Movimiento.builder()
                .activo(activo)
                .tipo(request.getTipo())
                .entidadOrigen(entidadOrigen)
                .sedeOrigen(sedeOrigen)
                .responsableAnterior(respAnterior)
                .ubicacionOrigen(request.getUbicacionOrigen())
                .entidadDestino(entidadDestino)
                .sedeDestino(sedeDestino)
                .responsableNuevo(respNuevo)
                .ubicacionDestino(request.getUbicacionDestino())
                .fecha(LocalDateTime.now())
                .usuarioOperacion(getCurrentUser())
                .motivo(request.getMotivo())
                .observaciones(request.getObservaciones())
                .confirmado(request.isAplicar())
                .build();

        movimiento = movimientoRepository.save(movimiento);

        if (request.isAplicar()) {
            aplicarMovimiento(activo, movimiento);
        }

        auditService.registrar("MOVIMIENTO_ACTIVO", "INVENTARIO", activo.getId(),
                activo.getCodigo() + " — " + movimiento.getTipo() + (request.isAplicar() ? " (aplicado)" : ""));
        return mapToResponse(movimiento);
    }

    @Transactional
    public void aplicarMovimiento(Activo activo, Movimiento m) {
        boolean cambio = false;
        if (m.getEntidadDestino() != null) { activo.setEntidad(m.getEntidadDestino()); cambio = true; }
        if (m.getSedeDestino() != null) { activo.setSede(m.getSedeDestino()); cambio = true; }
        if (m.getResponsableNuevo() != null) { activo.setResponsable(m.getResponsableNuevo()); cambio = true; }
        if (m.getUbicacionDestino() != null && !m.getUbicacionDestino().isBlank()) {
            activo.setUbicacionFisica(m.getUbicacionDestino()); cambio = true;
        }
        if (cambio) {
            if (!m.getTipo().name().equals("CAMBIO_RESPONSABLE")) {
                activoRepository.save(activo);
            } else {
                activoRepository.save(activo);
            }
        }
    }

    private MovimientoResponse mapToResponse(Movimiento m) {
        return MovimientoResponse.builder()
                .id(m.getId())
                .activoId(m.getActivo().getId())
                .activoCodigo(m.getActivo().getCodigo())
                .activoNombre(m.getActivo().getNombre())
                .tipo(m.getTipo())
                .entidadOrigenId(m.getEntidadOrigen() != null ? m.getEntidadOrigen().getId() : null)
                .entidadOrigenNombre(m.getEntidadOrigen() != null ? m.getEntidadOrigen().getNombre() : null)
                .sedeOrigenId(m.getSedeOrigen() != null ? m.getSedeOrigen().getId() : null)
                .sedeOrigenNombre(m.getSedeOrigen() != null ? m.getSedeOrigen().getNombre() : null)
                .responsableAnteriorId(m.getResponsableAnterior() != null ? m.getResponsableAnterior().getId() : null)
                .responsableAnteriorNombre(nombreCompleto(m.getResponsableAnterior()))
                .ubicacionOrigen(m.getUbicacionOrigen())
                .entidadDestinoId(m.getEntidadDestino() != null ? m.getEntidadDestino().getId() : null)
                .entidadDestinoNombre(m.getEntidadDestino() != null ? m.getEntidadDestino().getNombre() : null)
                .sedeDestinoId(m.getSedeDestino() != null ? m.getSedeDestino().getId() : null)
                .sedeDestinoNombre(m.getSedeDestino() != null ? m.getSedeDestino().getNombre() : null)
                .responsableNuevoId(m.getResponsableNuevo() != null ? m.getResponsableNuevo().getId() : null)
                .responsableNuevoNombre(nombreCompleto(m.getResponsableNuevo()))
                .ubicacionDestino(m.getUbicacionDestino())
                .fecha(m.getFecha())
                .usuarioOperacion(m.getUsuarioOperacion() != null ? m.getUsuarioOperacion().getUsername() : "SISTEMA")
                .motivo(m.getMotivo())
                .observaciones(m.getObservaciones())
                .documentoUrl(m.getDocumentoUrl())
                .confirmado(m.isConfirmado())
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
