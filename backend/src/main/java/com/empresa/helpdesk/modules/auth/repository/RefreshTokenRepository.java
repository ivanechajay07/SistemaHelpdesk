package com.empresa.helpdesk.modules.auth.repository;

import com.empresa.helpdesk.modules.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Sin clearAutomatically: limpiar el contexto descartaría cambios pendientes
    // (p. ej. la nueva contraseña o el tokenVersion) antes de hacer flush.
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revocado = true WHERE r.familia = :familia AND r.revocado = false")
    int revocarFamilia(@Param("familia") String familia);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revocado = true WHERE r.usuario.id = :usuarioId AND r.revocado = false")
    int revocarTodos(@Param("usuarioId") Long usuarioId);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expira < :corte")
    int purgarExpirados(@Param("corte") LocalDateTime corte);
}
