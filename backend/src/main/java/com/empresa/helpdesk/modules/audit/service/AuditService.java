package com.empresa.helpdesk.modules.audit.service;

import com.empresa.helpdesk.modules.audit.entity.AuditLog;
import com.empresa.helpdesk.modules.audit.repository.AuditLogRepository;
import com.empresa.helpdesk.security.DeviceInfoResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Registro de auditoría: quién hizo qué y cuándo, incluyendo el dispositivo
 * (modelo/tipo/navegador) y la IP desde donde se realizó la acción.
 * Los fallos de auditoría nunca deben romper la operación principal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String accion, String entidad, Long entidadId, String detalle) {
        registrarInterno(null, accion, entidad, entidadId, detalle);
    }

    /**
     * Igual que {@link #registrar(String, String, Long, String)} pero permite
     * indicar el usuario explícitamente (útil en el login, donde aún no hay
     * un contexto de seguridad establecido).
     */
    // Transacción independiente: el registro de auditoría se conserva aunque la
    // operación principal haga rollback.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String usuarioExplicito, String accion, String entidad, Long entidadId, String detalle) {
        registrarInterno(usuarioExplicito, accion, entidad, entidadId, detalle);
    }

    private void registrarInterno(String usuarioExplicito, String accion, String entidad, Long entidadId, String detalle) {
        try {
            String usuario = usuarioExplicito;
            if (usuario == null || usuario.isBlank()) {
                usuario = "SISTEMA";
                var auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                    usuario = auth.getName();
                }
            }

            DeviceInfoResolver.DeviceInfo di = resolverDispositivo();

            auditLogRepository.save(AuditLog.builder()
                    .usuario(usuario)
                    .accion(accion)
                    .entidad(entidad)
                    .entidadId(entidadId)
                    .detalle(detalle)
                    .dispositivoTipo(di != null ? di.tipo() : null)
                    .dispositivoModelo(di != null ? di.modelo() : null)
                    .navegador(di != null ? di.navegador() : null)
                    .ip(di != null ? di.ip() : null)
                    .build());
        } catch (Exception e) {
            log.error("Error registrando auditoría [{} / {}]: {}", accion, entidad, e.getMessage());
        }
    }

    private DeviceInfoResolver.DeviceInfo resolverDispositivo() {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sra) {
                HttpServletRequest request = sra.getRequest();
                return DeviceInfoResolver.resolve(request);
            }
        } catch (Exception ignored) {
            // Sin contexto de petición (p. ej. tareas asíncronas)
        }
        return null;
    }
}
