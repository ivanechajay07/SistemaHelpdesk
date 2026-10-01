package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.Movimiento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimientoRepository extends JpaRepository<Movimiento, Long> {

    @EntityGraph(attributePaths = {"activo", "entidadOrigen", "sedeOrigen", "responsableAnterior",
            "entidadDestino", "sedeDestino", "responsableNuevo", "usuarioOperacion"})
    List<Movimiento> findByActivoIdOrderByFechaDesc(Long activoId);

    @EntityGraph(attributePaths = {"activo", "entidadOrigen", "sedeOrigen", "responsableAnterior",
            "entidadDestino", "sedeDestino", "responsableNuevo", "usuarioOperacion"})
    Page<Movimiento> findAllByOrderByFechaDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"activo", "entidadOrigen", "sedeOrigen", "responsableAnterior",
            "entidadDestino", "sedeDestino", "responsableNuevo", "usuarioOperacion"})
    Page<Movimiento> findByActivoId(Long activoId, Pageable pageable);

    @Query("SELECT MONTH(m.fecha), COUNT(m) FROM Movimiento m WHERE m.fecha >= :inicio GROUP BY MONTH(m.fecha) ORDER BY MONTH(m.fecha)")
    List<Object[]> countByMonth(@Param("inicio") LocalDateTime inicio);

    @Query("SELECT m.tipo, COUNT(m) FROM Movimiento m WHERE m.fecha >= :inicio GROUP BY m.tipo")
    List<Object[]> countByTipo(@Param("inicio") LocalDateTime inicio);

    long countByTipo(com.empresa.helpdesk.modules.inventario.enums.MovimientoTipo tipo);
}
