package com.smartbiz.ai.service;

import com.smartbiz.ai.model.AiUsageMonthly;
import com.smartbiz.ai.repository.AiUsageMonthlyRepository;
import com.smartbiz.payment.PlanAccessClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;

@Service
@RequiredArgsConstructor
public class AiUsageService {
    private final AiUsageMonthlyRepository repository;
    private final PlanAccessClient planAccessClient;

    @Transactional
    public void consume(Long userId) {
        if (planAccessClient.isPro(userId)) return;
        LocalDate period = LocalDate.now(ZoneId.of("Asia/Kathmandu")).withDayOfMonth(1);
        AiUsageMonthly usage = repository.findByUserIdAndPeriodStart(userId, period)
            .orElseGet(() -> AiUsageMonthly.builder().userId(userId).periodStart(period).requestCount(0).build());
        planAccessClient.requireWithinLimit(userId, "Monthly AI requests", usage.getRequestCount(), 10);
        usage.setRequestCount(usage.getRequestCount() + 1);
        usage.setUpdatedAt(LocalDateTime.now());
        repository.save(usage);
    }
}
