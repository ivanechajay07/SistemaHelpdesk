package com.empresa.helpdesk.modules.audit.service;

import com.empresa.helpdesk.modules.audit.entity.AuditLog;
import com.empresa.helpdesk.modules.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Registro de auditoría: quién hizo qué y cuándo.
 * Los fallos de auditoría nunca deben romper la operación principal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void registrar(String accion, String entidad, Long entidadId, String detalle) {
        try {
            String usuario = "SISTEMA";
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                usuario = auth.getName();
            }
            auditLogRepository.save(AuditLog.builder()
                    .usuario(usuario)
                    .accion(accion)
                    .entidad(entidad)
                    .entidadId(entidadId)
                    .detalle(detalle)
                    .build());
        } catch (Exception e) {
            log.error("Error registrando auditoría [{} / {}]: {}", accion, entidad, e.getMessage());
        }
    }
}
