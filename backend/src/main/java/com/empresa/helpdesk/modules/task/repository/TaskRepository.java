package com.empresa.helpdesk.modules.task.repository;

import com.empresa.helpdesk.modules.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByTecnicoIdOrderByFechaInicioAsc(Long tecnicoId);

    List<Task> findAllByOrderByFechaInicioAsc();

    List<Task> findByTecnicoIdAndFechaInicioBetweenOrderByFechaInicioAsc(Long tecnicoId, java.time.LocalDate start, java.time.LocalDate end);

    List<Task> findByFechaInicioBetweenOrderByFechaInicioAsc(java.time.LocalDate start, java.time.LocalDate end);

    List<Task> findTop15ByOrderByFechaCreacionDesc();

    List<Task> findTop10ByTecnicoIdOrderByFechaCreacionDesc(Long tecnicoId);
}
