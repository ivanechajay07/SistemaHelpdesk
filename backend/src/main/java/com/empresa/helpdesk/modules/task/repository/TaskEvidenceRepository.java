package com.empresa.helpdesk.modules.task.repository;

import com.empresa.helpdesk.modules.task.entity.TaskEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskEvidenceRepository extends JpaRepository<TaskEvidence, Long> {

    List<TaskEvidence> findByTaskIdOrderByFechaCreacionAsc(Long taskId);

    long countByTaskIdAndTipo(Long taskId, String tipo);

    long countByTaskId(Long taskId);

    void deleteByTaskId(Long taskId);
}
