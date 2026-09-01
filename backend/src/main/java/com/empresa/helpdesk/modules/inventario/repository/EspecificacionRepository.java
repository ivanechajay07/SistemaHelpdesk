package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.Especificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EspecificacionRepository extends JpaRepository<Especificacion, Long> {
    List<Especificacion> findByActivoIdOrderByIdAsc(Long activoId);
    void deleteByActivoId(Long activoId);
}
