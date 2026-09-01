package com.empresa.helpdesk.modules.ticket.repository;

import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubcategoryRepository extends JpaRepository<Subcategory, Long> {
    Optional<Subcategory> findByNameIgnoreCase(String name);
}
