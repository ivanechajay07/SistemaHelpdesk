package com.empresa.helpdesk.modules.catalog.repository;

import com.empresa.helpdesk.modules.catalog.entity.Sede;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SedeRepository extends JpaRepository<Sede, Long> {

    @Query("SELECT s FROM Sede s JOIN FETCH s.entidad ORDER BY s.entidad.nombre ASC, s.nombre ASC")
    List<Sede> findAllWithEntidad();
}
