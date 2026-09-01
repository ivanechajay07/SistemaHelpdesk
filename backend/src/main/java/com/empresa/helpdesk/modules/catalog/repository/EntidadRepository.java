package com.empresa.helpdesk.modules.catalog.repository;

import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EntidadRepository extends JpaRepository<Entidad, Long> {
    Optional<Entidad> findByNombreIgnoreCase(String nombre);
}
