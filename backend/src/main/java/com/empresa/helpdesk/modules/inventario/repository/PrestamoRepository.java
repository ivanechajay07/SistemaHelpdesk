package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.Prestamo;
import com.empresa.helpdesk.modules.inventario.enums.PrestamoEstado;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PrestamoRepository extends JpaRepository<Prestamo, Long> {

    @EntityGraph(attributePaths = {"activo", "solicitante", "responsableEntrega"})
    List<Prestamo> findByActivoIdOrderByFechaCreacionDesc(Long activoId);

    @EntityGraph(attributePaths = {"activo", "solicitante", "responsableEntrega"})
    List<Prestamo> findAllByOrderByFechaCreacionDesc();

    long countByEstado(PrestamoEstado estado);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) FROM Prestamo p WHERE p.estado IN :activos AND p.fechaDevolucionPrevista < :hoy")
    long countVencidos(@org.springframework.data.repository.query.Param("activos") List<PrestamoEstado> activos, @org.springframework.data.repository.query.Param("hoy") LocalDate hoy);

    @EntityGraph(attributePaths = {"activo", "solicitante", "responsableEntrega"})
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Prestamo p WHERE p.estado IN :activos AND p.fechaDevolucionPrevista < :hoy ORDER BY p.fechaDevolucionPrevista ASC")
    List<Prestamo> findVencidos(@org.springframework.data.repository.query.Param("activos") List<PrestamoEstado> activos, @org.springframework.data.repository.query.Param("hoy") LocalDate hoy);
}
