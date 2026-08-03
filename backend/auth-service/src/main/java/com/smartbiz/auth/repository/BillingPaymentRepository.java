package com.smartbiz.auth.repository;

import com.smartbiz.auth.model.BillingPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BillingPaymentRepository extends JpaRepository<BillingPayment, UUID> {
    Optional<BillingPayment> findByIdAndUserId(UUID id, Long userId);
    Optional<BillingPayment> findByTransactionUuid(String transactionUuid);
}
