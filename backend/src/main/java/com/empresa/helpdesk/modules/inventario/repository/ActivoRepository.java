package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActivoRepository extends JpaRepository<Activo, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Activo a WHERE a.id = :id")
    Optional<Activo> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"categoria", "entidad", "sede", "responsable"})
    @Query("SELECT a FROM Activo a WHERE a.id = :id")
    Optional<Activo> findConRelacionesById(@Param("id") Long id);

    Optional<Activo> findByCodigo(String codigo);
    Optional<Activo> findByQrToken(String qrToken);
    Optional<Activo> findByQrTokenIgnoreCase(String qrToken);
    List<Activo> findByQrTokenIsNull();
    boolean existsByCodigo(String codigo);
    List<Activo> findByEstado(ActivoEstado estado);

    long countByEstado(ActivoEstado estado);
    long countByResponsableIsNull();
    long countBySedeIsNull();
    long countByEntidadIsNull();

    @Query("SELECT COUNT(a) FROM Activo a WHERE a.tieneGarantia = true AND a.garantiaVencimiento >= :hoy AND a.garantiaVencimiento <= :proximo")
    long countGarantiasPorVencer(@Param("hoy") LocalDate hoy, @Param("proximo") LocalDate proximo);

    @Query("SELECT COUNT(a) FROM Activo a WHERE a.tieneGarantia = true AND a.garantiaVencimiento < :hoy")
    long countGarantiasVencidas(@Param("hoy") LocalDate hoy);

    @Query("SELECT COUNT(a) FROM Activo a WHERE a.estado = :estado AND a.fechaActualizacion < :corte")
    long countEnReparacionMuchoTiempo(@Param("estado") ActivoEstado estado, @Param("corte") java.time.LocalDateTime corte);

    @Query("""
        SELECT a FROM Activo a
        WHERE (:q IS NULL OR LOWER(a.codigo) LIKE LOWER(CONCAT('%',:q,'%'))
           OR LOWER(a.nombre) LIKE LOWER(CONCAT('%',:q,'%'))
           OR LOWER(a.marca) LIKE LOWER(CONCAT('%',:q,'%'))
           OR LOWER(a.modelo) LIKE LOWER(CONCAT('%',:q,'%'))
           OR LOWER(a.numeroSerie) LIKE LOWER(CONCAT('%',:q,'%')))
          AND (:estado IS NULL OR a.estado = :estado)
          AND (:entidadId IS NULL OR a.entidad.id = :entidadId)
          AND (:sedeId IS NULL OR a.sede.id = :sedeId)
          AND (:categoriaId IS NULL OR a.categoria.id = :categoriaId)
          AND (:responsableId IS NULL OR a.responsable.id = :responsableId)
    """)
    @EntityGraph(attributePaths = {"categoria", "entidad", "sede", "responsable"})
    Page<Activo> buscar(
            @Param("q") String q,
            @Param("estado") ActivoEstado estado,
            @Param("entidadId") Long entidadId,
            @Param("sedeId") Long sedeId,
            @Param("categoriaId") Long categoriaId,
            @Param("responsableId") Long responsableId,
            Pageable pageable);

    // Estadísticas dashboard
    @Query("SELECT a.estado, COUNT(a) FROM Activo a GROUP BY a.estado")
    List<Object[]> countByEstadoGroup();

    @Query("SELECT e.nombre, COUNT(a) FROM Activo a LEFT JOIN a.entidad e GROUP BY e.nombre")
    List<Object[]> countByEntidad();

    @Query("SELECT s.nombre, COUNT(a) FROM Activo a LEFT JOIN a.sede s GROUP BY s.nombre")
    List<Object[]> countBySede();

    @Query("SELECT c.nombre, COUNT(a) FROM Activo a LEFT JOIN a.categoria c GROUP BY c.nombre")
    List<Object[]> countByCategoria();
}
