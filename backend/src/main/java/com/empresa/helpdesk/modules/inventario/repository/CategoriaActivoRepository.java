package com.empresa.helpdesk.modules.inventario.repository;

import com.empresa.helpdesk.modules.inventario.entity.CategoriaActivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoriaActivoRepository extends JpaRepository<CategoriaActivo, Long> {
    Optional<CategoriaActivo> findByNombreIgnoreCase(String nombre);
}
