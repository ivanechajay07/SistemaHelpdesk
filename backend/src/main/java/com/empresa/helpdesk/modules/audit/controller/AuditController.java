package com.empresa.helpdesk.modules.audit.controller;

import com.empresa.helpdesk.modules.audit.dto.AuditLogResponse;
import com.empresa.helpdesk.modules.audit.entity.AuditLog;
import com.empresa.helpdesk.modules.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<Page<AuditLogResponse>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "fecha"));
        Page<AuditLog> result = (q != null && !q.isBlank())
                ? auditLogRepository.buscar(q.trim(), pageable)
                : auditLogRepository.findAll(pageable);
        return ResponseEntity.ok(result.map(this::toResponse));
    }

    private AuditLogResponse toResponse(AuditLog a) {
        return AuditLogResponse.builder()
                .id(a.getId())
                .usuario(a.getUsuario())
                .accion(a.getAccion())
                .entidad(a.getEntidad())
                .entidadId(a.getEntidadId())
                .detalle(a.getDetalle())
                .dispositivoTipo(a.getDispositivoTipo())
                .dispositivoModelo(a.getDispositivoModelo())
                .navegador(a.getNavegador())
                .ip(a.getIp())
                .fecha(a.getFecha())
                .build();
    }
}
