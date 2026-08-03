package com.smartbiz.auth.repository;

import com.smartbiz.auth.model.ProcessedPaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedPaymentEventRepository extends JpaRepository<ProcessedPaymentEvent, Long> {
    boolean existsByProviderAndEventId(String provider, String eventId);
}
