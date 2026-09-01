package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.Mantenimiento;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {

    List<Mantenimiento> findByActivoIdOrderByFechaDesc(Long activoId);
    List<Mantenimiento> findAllByOrderByFechaDesc();

    long countByEstado(MantenimientoEstado estado);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Mantenimiento m WHERE m.proximaRevision >= :hoy AND m.proximaRevision <= :proximo")
    long countProximos(@org.springframework.data.repository.query.Param("hoy") LocalDate hoy, @org.springframework.data.repository.query.Param("proximo") LocalDate proximo);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Mantenimiento m WHERE m.proximaRevision < :hoy")
    long countVencidos(@org.springframework.data.repository.query.Param("hoy") LocalDate hoy);
}
