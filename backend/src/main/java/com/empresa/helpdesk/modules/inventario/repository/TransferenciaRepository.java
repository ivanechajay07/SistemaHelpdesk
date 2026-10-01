package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.Transferencia;
import com.empresa.helpdesk.modules.inventario.enums.TransferenciaEstado;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransferenciaRepository extends JpaRepository<Transferencia, Long> {
    Optional<Transferencia> findByNumeroDocumento(String numeroDocumento);

    @EntityGraph(attributePaths = {"entidadOrigen", "sedeOrigen", "entidadDestino", "sedeDestino",
            "responsableEntrega", "responsableRecibe", "creadoPor"})
    List<Transferencia> findTop1000ByOrderByFechaDesc();

    @EntityGraph(attributePaths = {"entidadOrigen", "sedeOrigen", "entidadDestino", "sedeDestino",
            "responsableEntrega", "responsableRecibe", "creadoPor"})
    List<Transferencia> findByEstadoOrderByFechaDesc(TransferenciaEstado estado);

    long countByEstado(TransferenciaEstado estado);
}
