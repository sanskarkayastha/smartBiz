package com.smartbiz.sales.repository;

import com.smartbiz.sales.model.PosPaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PosPaymentAttemptRepository extends JpaRepository<PosPaymentAttempt, UUID> {
    Optional<PosPaymentAttempt> findByIdAndUserId(UUID id, Long userId);
    List<PosPaymentAttempt> findByStatusInAndExpiresAtBefore(List<String> statuses, LocalDateTime time);
    boolean existsByUserIdAndStatusIn(Long userId, List<String> statuses);
}
