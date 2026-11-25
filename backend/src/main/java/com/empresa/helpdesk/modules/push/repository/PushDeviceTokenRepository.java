package com.empresa.helpdesk.modules.push.repository;

import com.empresa.helpdesk.modules.push.entity.PushDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushDeviceTokenRepository extends JpaRepository<PushDeviceToken, Long> {

    Optional<PushDeviceToken> findByToken(String token);

    List<PushDeviceToken> findByUsuarioId(Long usuarioId);

    void deleteByToken(String token);
}
