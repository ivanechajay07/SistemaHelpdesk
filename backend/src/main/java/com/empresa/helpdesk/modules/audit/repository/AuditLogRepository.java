package com.empresa.helpdesk.modules.audit.repository;

import com.empresa.helpdesk.modules.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByEntidadIgnoreCase(String entidad, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE LOWER(a.usuario) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "OR LOWER(a.accion) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "OR LOWER(a.detalle) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "OR LOWER(a.dispositivoModelo) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "OR LOWER(a.ip) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<AuditLog> buscar(@Param("q") String q, Pageable pageable);
}
