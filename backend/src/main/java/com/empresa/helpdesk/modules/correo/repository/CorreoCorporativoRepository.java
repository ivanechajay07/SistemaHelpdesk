package com.empresa.helpdesk.modules.correo.repository;

import com.empresa.helpdesk.modules.correo.entity.CorreoCorporativo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CorreoCorporativoRepository extends JpaRepository<CorreoCorporativo, Long> {

    @Query("SELECT c FROM CorreoCorporativo c JOIN FETCH c.cuentas ORDER BY c.apellidos ASC, c.nombre ASC")
    List<CorreoCorporativo> findAllWithCuentas();
}