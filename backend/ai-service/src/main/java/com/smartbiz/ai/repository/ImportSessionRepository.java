package com.smartbiz.ai.repository;

import com.smartbiz.ai.model.ImportSession;
import com.smartbiz.ai.model.ImportSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ImportSessionRepository extends JpaRepository<ImportSession, Long> {

    Optional<ImportSession> findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(
            Long userId,
            Collection<ImportSessionStatus> statuses
    );

    List<ImportSession> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
