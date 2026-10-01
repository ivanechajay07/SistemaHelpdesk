package com.empresa.helpdesk.modules.user.repository;

import com.empresa.helpdesk.modules.user.entity.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    Optional<PasswordResetRequest> findByToken(String token);
    Optional<PasswordResetRequest> findByTokenAndStatus(String token, PasswordResetRequest.ResetStatus status);
    List<PasswordResetRequest> findByStatus(PasswordResetRequest.ResetStatus status);
    List<PasswordResetRequest> findByUsuarioId(Long usuarioId);
    List<PasswordResetRequest> findByUsuarioIdAndStatus(Long usuarioId, PasswordResetRequest.ResetStatus status);
    List<PasswordResetRequest> findTop10ByStatusOrderByFechaResolucionDesc(PasswordResetRequest.ResetStatus status);
    boolean existsByUsuarioIdAndStatus(Long usuarioId, PasswordResetRequest.ResetStatus status);
}
