package com.smartbiz.ai.repository;

import com.smartbiz.ai.model.AiUsageMonthly;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface AiUsageMonthlyRepository extends JpaRepository<AiUsageMonthly, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AiUsageMonthly> findByUserIdAndPeriodStart(Long userId, LocalDate periodStart);

    @Query("SELECT u.requestCount FROM AiUsageMonthly u WHERE u.userId = :userId AND u.periodStart = :periodStart")
    Optional<Integer> findRequestCount(@Param("userId") Long userId, @Param("periodStart") LocalDate periodStart);
}
