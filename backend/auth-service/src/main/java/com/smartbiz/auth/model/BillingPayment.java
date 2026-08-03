package com.smartbiz.auth.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "billing_payments")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BillingPayment {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false) private String provider;
    @Column(name = "billing_term", nullable = false) private String billingTerm;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false) private String status;
    @Column(name = "transaction_uuid", nullable = false, unique = true) private String transactionUuid;
    @Column(name = "provider_reference") private String providerReference;
    @Column(name = "checkout_url") private String checkoutUrl;
    @Column(name = "start_token", unique = true) private String startToken;
    @Column(name = "return_url", nullable = false) private String returnUrl;
    @Column(name = "completed_at") private LocalDateTime completedAt;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
