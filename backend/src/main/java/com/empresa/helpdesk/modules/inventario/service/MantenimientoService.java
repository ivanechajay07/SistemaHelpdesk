package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.inventario.dto.MantenimientoCierreRequest;
import com.empresa.helpdesk.modules.inventario.dto.MantenimientoRequest;
import com.empresa.helpdesk.modules.inventario.dto.MantenimientoResponse;
import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.entity.Mantenimiento;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.MantenimientoRepository;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MantenimientoService {

    private final MantenimientoRepository mantenimientoRepository;
    private final ActivoRepository activoRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<MantenimientoResponse> listar() {
        return mantenimientoRepository.findTop1000ByOrderByFechaDesc().stream()
                .map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MantenimientoResponse> listarPorActivo(Long activoId) {
        return mantenimientoRepository.findTop500ByActivoIdOrderByFechaDesc(activoId).stream()
                .map(this::mapToResponse).toList();
    }

    /**
     * Crea un mantenimiento. Si el estado del mantenimiento es EN_PROCESO,
     * pone el activo en estado EN_MANTENIMIENTO. Si se finaliza, vuelve a OPERATIVO.
     */
    @Transactional
    public MantenimientoResponse crear(MantenimientoRequest request) {
        Activo activo = activoRepository.findById(request.getActivoId())
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));

        Mantenimiento m = Mantenimiento.builder()
                .activo(activo)
                .tipo(request.getTipo())
                .estado(request.getEstado())
                .fecha(request.getFecha())
                .tecnico(request.getTecnicoId() != null ? userRepository.findById(request.getTecnicoId()).orElse(null) : null)
                .proveedor(request.getProveedor())
                .descripcion(request.getDescripcion())
                .problemaEncontrado(request.getProblemaEncontrado())
                .trabajoRealizado(request.getTrabajoRealizado())
                .repuestos(request.getRepuestos())
                .costo(request.getCosto())
                .proximaRevision(request.getProximaRevision())
                .observaciones(request.getObservaciones())
                .ticket(request.getTicketId() != null ? ticketRepository.findById(request.getTicketId()).orElse(null) : null)
                .build();

        m = mantenimientoRepository.save(m);
        actualizarEstadoActivo(activo, request.getEstado());
        auditService.registrar("CREAR_MANTENIMIENTO", "INVENTARIO", activo.getId(),
                activo.getCodigo() + " — " + m.getTipo() + "/" + m.getEstado());
        return mapToResponse(m);
    }

    @Transactional
    public MantenimientoResponse actualizarEstado(Long id, MantenimientoCierreRequest req) {
        Mantenimiento m = mantenimientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mantenimiento no encontrado"));

        MantenimientoEstado estado = req.getEstado();
        m.setEstado(estado);
        // Informe de lo realizado: se guarda lo que venga informado.
        if (req.getTrabajoRealizado() != null) m.setTrabajoRealizado(req.getTrabajoRealizado());
        if (req.getProblemaEncontrado() != null) m.setProblemaEncontrado(req.getProblemaEncontrado());
        if (req.getRepuestos() != null) m.setRepuestos(req.getRepuestos());
        if (req.getCosto() != null) m.setCosto(req.getCosto());
        if (req.getProximaRevision() != null) m.setProximaRevision(req.getProximaRevision());
        if (req.getObservaciones() != null) m.setObservaciones(req.getObservaciones());
        m = mantenimientoRepository.save(m);

        Activo activo = m.getActivo();
        if (estado == MantenimientoEstado.FINALIZADO) {
            activo.setEstado(ActivoEstado.OPERATIVO);
            activoRepository.save(activo);
        } else if (estado == MantenimientoEstado.EN_PROCESO) {
            activo.setEstado(ActivoEstado.EN_MANTENIMIENTO);
            activoRepository.save(activo);
        }

        auditService.registrar("MANTENIMIENTO", "INVENTARIO", m.getId(),
                m.getActivo().getCodigo() + " → " + estado);
        return mapToResponse(m);
    }

    private void actualizarEstadoActivo(Activo activo, MantenimientoEstado estado) {
        ActivoEstado nuevo = null;
        switch (estado) {
            case EN_PROCESO -> nuevo = ActivoEstado.EN_MANTENIMIENTO;
            case FINALIZADO -> nuevo = ActivoEstado.OPERATIVO;
            default -> { return; }
        }
        activo.setEstado(nuevo);
        activoRepository.save(activo);
    }

    private MantenimientoResponse mapToResponse(Mantenimiento m) {
        return MantenimientoResponse.builder()
                .id(m.getId())
                .activoId(m.getActivo().getId())
                .activoCodigo(m.getActivo().getCodigo())
                .activoNombre(m.getActivo().getNombre())
                .tipo(m.getTipo())
                .estado(m.getEstado())
                .fecha(m.getFecha())
                .tecnicoId(m.getTecnico() != null ? m.getTecnico().getId() : null)
                .tecnicoNombre(m.getTecnico() != null ? nombreCompleto(m.getTecnico()) : null)
                .proveedor(m.getProveedor())
                .descripcion(m.getDescripcion())
                .problemaEncontrado(m.getProblemaEncontrado())
                .trabajoRealizado(m.getTrabajoRealizado())
                .repuestos(m.getRepuestos())
                .costo(m.getCosto())
                .proximaRevision(m.getProximaRevision())
                .observaciones(m.getObservaciones())
                .ticketId(m.getTicket() != null ? m.getTicket().getId() : null)
                .ticketCodigo(m.getTicket() != null ? m.getTicket().getCodigo() : null)
                .documentoUrl(m.getDocumentoUrl())
                .fechaCreacion(m.getFechaCreacion())
                .build();
    }

    private String nombreCompleto(User u) {
        if (u == null) return null;
        return ((u.getNombre() == null ? "" : u.getNombre()) + " " + (u.getApellidos() == null ? "" : u.getApellidos())).trim();
    }
}
