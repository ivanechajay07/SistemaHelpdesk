package com.empresa.helpdesk.modules.monitoring.repository;

import com.empresa.helpdesk.modules.monitoring.entity.MonitoredTarget;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MonitoredTargetRepository extends JpaRepository<MonitoredTarget, Long> {

    List<MonitoredTarget> findByActivoTrue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM MonitoredTarget t WHERE t.id = :id")
    Optional<MonitoredTarget> findByIdForUpdate(Long id);
}
