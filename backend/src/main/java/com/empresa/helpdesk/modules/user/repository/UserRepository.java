package com.empresa.helpdesk.modules.user.repository;

import com.empresa.helpdesk.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameOrEmail(String username, String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    java.util.List<User> findByRoles_Name(String roleName);
    java.util.List<User> findByActivoFalseOrderByIdDesc();
    java.util.List<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrNombreContainingIgnoreCaseOrApellidosContainingIgnoreCase(
            String username, String email, String nombre, String apellidos);
}
