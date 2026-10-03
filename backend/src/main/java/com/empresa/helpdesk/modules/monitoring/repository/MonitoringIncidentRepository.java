package com.empresa.helpdesk.modules.monitoring.repository;

import com.empresa.helpdesk.modules.monitoring.entity.MonitoringIncident;
import com.empresa.helpdesk.modules.monitoring.enums.IncidentEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MonitoringIncidentRepository extends JpaRepository<MonitoringIncident, Long> {

    Optional<MonitoringIncident> findFirstByTargetIdAndEstadoOrderByInicioDesc(Long targetId, IncidentEstado estado);

    List<MonitoringIncident> findAllByOrderByInicioDesc();

    long countByEstado(IncidentEstado estado);

    @Query("SELECT AVG(i.duracionSegundos) FROM MonitoringIncident i WHERE i.estado = :estado")
    Double avgDuracionByEstado(@Param("estado") IncidentEstado estado);
}
