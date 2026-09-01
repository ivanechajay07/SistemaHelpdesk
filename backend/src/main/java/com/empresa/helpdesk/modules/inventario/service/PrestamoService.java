package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.inventario.dto.PrestamoRequest;
import com.empresa.helpdesk.modules.inventario.dto.PrestamoResponse;
import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.entity.Prestamo;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import com.empresa.helpdesk.modules.inventario.enums.PrestamoEstado;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.PrestamoRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrestamoService {

    private final PrestamoRepository prestamoRepository;
    private final ActivoRepository activoRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<PrestamoResponse> listar() {
        LocalDate hoy = LocalDate.now();
        return prestamoRepository.findAllByOrderByFechaCreacionDesc().stream()
                .map(p -> mapToResponse(p, hoy)).toList();
    }

    @Transactional(readOnly = true)
    public List<PrestamoResponse> listarPorActivo(Long activoId) {
        LocalDate hoy = LocalDate.now();
        return prestamoRepository.findByActivoIdOrderByFechaCreacionDesc(activoId).stream()
                .map(p -> mapToResponse(p, hoy)).toList();
    }

    @Transactional
    public PrestamoResponse crear(PrestamoRequest request) {
        Activo activo = activoRepository.findById(request.getActivoId())
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        if (activo.getEstado() != ActivoEstado.OPERATIVO) {
            throw new RuntimeException("El activo no está en estado OPERATIVO para ser prestado (estado actual: " + activo.getEstado() + ")");
        }

        Prestamo p = Prestamo.builder()
                .activo(activo)
                .solicitante(request.getSolicitanteId() != null ? userRepository.findById(request.getSolicitanteId()).orElse(null) : null)
                .responsableEntrega(request.getResponsableEntregaId() != null ? userRepository.findById(request.getResponsableEntregaId()).orElse(null) : null)
                .fechaEntrega(request.getFechaEntrega() != null ? request.getFechaEntrega() : LocalDate.now())
                .fechaDevolucionPrevista(request.getFechaDevolucionPrevista())
                .motivo(request.getMotivo())
                .estado(request.getEstado() != null ? request.getEstado() : PrestamoEstado.ENTREGADO)
                .observaciones(request.getObservaciones())
                .build();

        p = prestamoRepository.save(p);
        if (p.getEstado() == PrestamoEstado.ENTREGADO) {
            activo.setEstado(ActivoEstado.PRESTADO);
            activoRepository.save(activo);
        }
        auditService.registrar("CREAR_PRESTAMO", "INVENTARIO", activo.getId(),
                activo.getCodigo() + " prestado a " + (p.getSolicitante() != null ? p.getSolicitante().getUsername() : "—"));
        return mapToResponse(p, LocalDate.now());
    }

    @Transactional
    public PrestamoResponse devolver(Long id) {
        Prestamo p = prestamoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Préstamo no encontrado"));
        if (p.getEstado() == PrestamoEstado.DEVUELTO) {
            throw new RuntimeException("El préstamo ya fue devuelto");
        }
        p.setEstado(PrestamoEstado.DEVUELTO);
        p.setFechaDevolucionReal(LocalDate.now());
        p = prestamoRepository.save(p);

        Activo activo = p.getActivo();
        if (activo.getEstado() == ActivoEstado.PRESTADO) {
            activo.setEstado(ActivoEstado.OPERATIVO);
            activoRepository.save(activo);
        }
        auditService.registrar("DEVOLVER_PRESTAMO", "INVENTARIO", activo.getId(),
                activo.getCodigo() + " devuelto");
        return mapToResponse(p, LocalDate.now());
    }

    @Transactional
    public PrestamoResponse cambiarEstado(Long id, PrestamoEstado estado) {
        Prestamo p = prestamoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Préstamo no encontrado"));
        p.setEstado(estado);
        p = prestamoRepository.save(p);
        return mapToResponse(p, LocalDate.now());
    }

    private PrestamoResponse mapToResponse(Prestamo p, LocalDate hoy) {
        boolean vencido = (p.getEstado() == PrestamoEstado.ENTREGADO || p.getEstado() == PrestamoEstado.VENCIDO)
                && p.getFechaDevolucionPrevista() != null && p.getFechaDevolucionPrevista().isBefore(hoy);
        return PrestamoResponse.builder()
                .id(p.getId())
                .activoId(p.getActivo().getId())
                .activoCodigo(p.getActivo().getCodigo())
                .activoNombre(p.getActivo().getNombre())
                .solicitanteId(p.getSolicitante() != null ? p.getSolicitante().getId() : null)
                .solicitanteNombre(p.getSolicitante() != null ? nombreCompleto(p.getSolicitante()) : null)
                .responsableEntregaId(p.getResponsableEntrega() != null ? p.getResponsableEntrega().getId() : null)
                .responsableEntregaNombre(p.getResponsableEntrega() != null ? nombreCompleto(p.getResponsableEntrega()) : null)
                .fechaEntrega(p.getFechaEntrega())
                .fechaDevolucionPrevista(p.getFechaDevolucionPrevista())
                .fechaDevolucionReal(p.getFechaDevolucionReal())
                .motivo(p.getMotivo())
                .estado(p.getEstado())
                .observaciones(p.getObservaciones())
                .fechaCreacion(p.getFechaCreacion())
                .devolucionVencida(vencido)
                .build();
    }

    private String nombreCompleto(User u) {
        if (u == null) return null;
        return ((u.getNombre() == null ? "" : u.getNombre()) + " " + (u.getApellidos() == null ? "" : u.getApellidos())).trim();
    }
}
