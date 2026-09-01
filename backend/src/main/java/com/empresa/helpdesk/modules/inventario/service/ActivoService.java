package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.catalog.repository.EntidadRepository;
import com.empresa.helpdesk.modules.catalog.repository.SedeRepository;
import com.empresa.helpdesk.modules.inventario.dto.ActivoRequest;
import com.empresa.helpdesk.modules.inventario.dto.ActivoResponse;
import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.entity.CategoriaActivo;
import com.empresa.helpdesk.modules.inventario.entity.Especificacion;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.CategoriaActivoRepository;
import com.empresa.helpdesk.modules.inventario.repository.EspecificacionRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivoService {

    private final ActivoRepository activoRepository;
    private final CategoriaActivoRepository categoriaRepository;
    private final EspecificacionRepository especificacionRepository;
    private final EntidadRepository entidadRepository;
    private final SedeRepository sedeRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<ActivoResponse> buscar(String q, ActivoEstado estado, Long entidadId, Long sedeId,
                                       Long categoriaId, Long responsableId, Pageable pageable) {
        return activoRepository.buscar(normalizarQ(q), estado, entidadId, sedeId, categoriaId, responsableId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public ActivoResponse obtener(Long id) {
        Activo activo = activoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        return mapToResponse(activo);
    }

    @Transactional(readOnly = true)
    public ActivoResponse obtenerPorQr(String qrToken) {
        Activo activo = activoRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        return mapToResponse(activo);
    }

    /**
     * Consulta pública de un activo por su QR (sin autenticación).
     * Expone solo datos básicos de identificación, sin información sensible
     * como costo, garantía, DNI o datos internos de compra.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerPorQrPublico(String qrToken) {
        Activo activo = activoRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        Map<String, Object> m = new HashMap<>();
        m.put("codigo", activo.getCodigo());
        m.put("nombre", activo.getNombre());
        m.put("categoria", activo.getCategoria() != null ? activo.getCategoria().getNombre() : null);
        m.put("marca", activo.getMarca());
        m.put("modelo", activo.getModelo());
        m.put("numeroSerie", activo.getNumeroSerie());
        m.put("estado", activo.getEstado());
        m.put("sede", activo.getSede() != null ? activo.getSede().getNombre() : null);
        m.put("entidad", activo.getSede() != null && activo.getSede().getEntidad() != null
                ? activo.getSede().getEntidad().getNombre() : null);
        m.put("area", activo.getArea());
        m.put("ubicacionFisica", activo.getUbicacionFisica());
        m.put("responsable", activo.getResponsable() != null
                ? activo.getResponsable().getNombre() + " " + activo.getResponsable().getApellidos() : null);
        m.put("cargoResponsable", activo.getCargoResponsable());
        m.put("fechaIngreso", activo.getFechaIngreso());
        m.put("fotoUrl", activo.getFotoUrl());
        Map<String, String> specs = new HashMap<>();
        especificacionRepository.findByActivoIdOrderByIdAsc(activo.getId())
                .forEach(e -> specs.put(e.getClave(), e.getValor()));
        m.put("especificaciones", specs);
        return m;
    }

    @Transactional
    public ActivoResponse crear(ActivoRequest request) {
        if (activoRepository.existsByCodigo(request.getCodigo().trim())) {
            throw new RuntimeException("Ya existe un activo con el código " + request.getCodigo());
        }
        Activo activo = aplicar(new Activo(), request);
        activo.setQrToken(generarQrToken());
        Activo saved = activoRepository.save(activo);
        guardarEspecificaciones(saved, request);
        auditService.registrar("CREAR_ACTIVO", "INVENTARIO", saved.getId(), saved.getCodigo() + " — " + saved.getNombre());
        return mapToResponse(saved);
    }

    @Transactional
    public ActivoResponse actualizar(Long id, ActivoRequest request) {
        Activo activo = activoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        if (!activo.getCodigo().equalsIgnoreCase(request.getCodigo().trim())
                && activoRepository.existsByCodigo(request.getCodigo().trim())) {
            throw new RuntimeException("Ya existe un activo con el código " + request.getCodigo());
        }
        ActivoResponse anterior = mapToResponse(activo);
        Activo guardado = activoRepository.save(aplicar(activo, request));
        guardarEspecificaciones(guardado, request);
        auditService.registrar("EDITAR_ACTIVO", "INVENTARIO", guardado.getId(),
                guardado.getCodigo() + " editado (estado: " + anterior.getEstado() + " → " + request.getEstado() + ")");
        return mapToResponse(guardado);
    }

    @Transactional
    public void eliminar(Long id) {
        Activo activo = activoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        especificacionRepository.deleteByActivoId(id);
        activoRepository.delete(activo);
        auditService.registrar("ELIMINAR_ACTIVO", "INVENTARIO", id, activo.getCodigo() + " eliminado");
    }

    @Transactional
    public ActivoResponse darDeBaja(Long id, String motivo) {
        Activo activo = activoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        activo.setEstado(ActivoEstado.DADO_DE_BAJA);
        Activo saved = activoRepository.save(activo);
        auditService.registrar("BAJA_ACTIVO", "INVENTARIO", id,
                saved.getCodigo() + " dado de baja" + (motivo != null && !motivo.isBlank() ? ": " + motivo : ""));
        return mapToResponse(saved);
    }

    @Transactional
    public String generarQr(Long id) {
        Activo activo = activoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activo no encontrado"));
        if (activo.getQrToken() == null) {
            activo.setQrToken(generarQrToken());
            activoRepository.save(activo);
        }
        auditService.registrar("GENERAR_QR", "INVENTARIO", id, "QR generado para " + activo.getCodigo());
        return activo.getQrToken();
    }

    private Activo aplicar(Activo a, ActivoRequest r) {
        a.setCodigo(r.getCodigo().trim());
        a.setNombre(r.getNombre().trim());
        a.setCategoria(categoriaRepository.findById(r.getCategoriaId())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada")));
        a.setMarca(r.getMarca());
        a.setModelo(r.getModelo());
        a.setNumeroSerie(r.getNumeroSerie());
        a.setCodigoPatrimonial(r.getCodigoPatrimonial());
        a.setEstado(r.getEstado());
        a.setFechaAdquisicion(r.getFechaAdquisicion());
        a.setFechaIngreso(r.getFechaIngreso() != null ? r.getFechaIngreso() : LocalDate.now());
        a.setEntidad(r.getEntidadId() != null ? entidadRepository.findById(r.getEntidadId()).orElse(null) : null);
        a.setSede(r.getSedeId() != null ? sedeRepository.findById(r.getSedeId()).orElse(null) : null);
        a.setArea(r.getArea());
        a.setUbicacionFisica(r.getUbicacionFisica());
        a.setResponsable(r.getResponsableId() != null ? userRepository.findById(r.getResponsableId()).orElse(null) : null);
        a.setCargoResponsable(r.getCargoResponsable());
        a.setDniResponsable(r.getDniResponsable());
        a.setProveedor(r.getProveedor());
        a.setNumeroFactura(r.getNumeroFactura());
        a.setFechaCompra(r.getFechaCompra());
        a.setCosto(r.getCosto());
        a.setMoneda(r.getMoneda());
        a.setOrdenCompra(r.getOrdenCompra());
        a.setTieneGarantia(r.isTieneGarantia());
        a.setGarantiaInicio(r.getGarantiaInicio());
        a.setGarantiaVencimiento(r.getGarantiaVencimiento());
        a.setProveedorGarantia(r.getProveedorGarantia());
        if (r.getFotoUrl() != null) a.setFotoUrl(r.getFotoUrl());
        return a;
    }

    private void guardarEspecificaciones(Activo activo, ActivoRequest r) {
        especificacionRepository.deleteByActivoId(activo.getId());
        if (r.getEspecificaciones() != null) {
            r.getEspecificaciones().forEach((clave, valor) -> {
                if (valor != null && !valor.isBlank()) {
                    especificacionRepository.save(Especificacion.builder()
                            .activo(activo)
                            .clave(clave.trim())
                            .valor(valor.trim())
                            .build());
                }
            });
        }
    }

    private Map<String, String> obtenerEspecificaciones(Long activoId) {
        Map<String, String> map = new HashMap<>();
        especificacionRepository.findByActivoIdOrderByIdAsc(activoId)
                .forEach(e -> map.put(e.getClave(), e.getValor()));
        return map;
    }

    private ActivoResponse mapToResponse(Activo a) {
        LocalDate hoy = LocalDate.now();
        boolean garantiaPorVencer = a.isTieneGarantia() && a.getGarantiaVencimiento() != null
                && !a.getGarantiaVencimiento().isBefore(hoy)
                && a.getGarantiaVencimiento().isBefore(hoy.plusDays(30));
        boolean garantiaVencida = a.isTieneGarantia() && a.getGarantiaVencimiento() != null
                && a.getGarantiaVencimiento().isBefore(hoy);

        return ActivoResponse.builder()
                .id(a.getId())
                .codigo(a.getCodigo())
                .nombre(a.getNombre())
                .categoriaId(a.getCategoria() != null ? a.getCategoria().getId() : null)
                .categoriaNombre(a.getCategoria() != null ? a.getCategoria().getNombre() : null)
                .marca(a.getMarca())
                .modelo(a.getModelo())
                .numeroSerie(a.getNumeroSerie())
                .codigoPatrimonial(a.getCodigoPatrimonial())
                .estado(a.getEstado())
                .fechaAdquisicion(a.getFechaAdquisicion())
                .fechaIngreso(a.getFechaIngreso())
                .entidadId(a.getEntidad() != null ? a.getEntidad().getId() : null)
                .entidadNombre(a.getEntidad() != null ? a.getEntidad().getNombre() : null)
                .sedeId(a.getSede() != null ? a.getSede().getId() : null)
                .sedeNombre(a.getSede() != null ? a.getSede().getNombre() : null)
                .area(a.getArea())
                .ubicacionFisica(a.getUbicacionFisica())
                .responsableId(a.getResponsable() != null ? a.getResponsable().getId() : null)
                .responsableNombre(a.getResponsable() != null ? (a.getResponsable().getNombre() + " " + (a.getResponsable().getApellidos() == null ? "" : a.getResponsable().getApellidos())).trim() : null)
                .cargoResponsable(a.getCargoResponsable())
                .dniResponsable(a.getDniResponsable())
                .proveedor(a.getProveedor())
                .numeroFactura(a.getNumeroFactura())
                .fechaCompra(a.getFechaCompra())
                .costo(a.getCosto())
                .moneda(a.getMoneda())
                .ordenCompra(a.getOrdenCompra())
                .tieneGarantia(a.isTieneGarantia())
                .garantiaInicio(a.getGarantiaInicio())
                .garantiaVencimiento(a.getGarantiaVencimiento())
                .proveedorGarantia(a.getProveedorGarantia())
                .fotoUrl(a.getFotoUrl())
                .qrToken(a.getQrToken())
                .fechaCreacion(a.getFechaCreacion())
                .fechaActualizacion(a.getFechaActualizacion())
                .garantiaPorVencer(garantiaPorVencer)
                .garantiaVencida(garantiaVencida)
                .build();
    }

    String generarQrToken() {
        return "INV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();
    }

    private String normalizarQ(String q) {
        if (q == null) return null;
        String t = q.trim();
        return t.isEmpty() ? null : t;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    @Transactional(readOnly = true)
    public ActivoResponse obtenerConEspecificaciones(Long id) {
        ActivoResponse r = obtener(id);
        r.setEspecificaciones(obtenerEspecificaciones(id));
        return r;
    }
}
