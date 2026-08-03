package com.smartbiz.sales.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pos_payment_attempts")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PosPaymentAttempt {
    @Id private UUID id;
    @Column(name = "sale_id", nullable = false, unique = true) private Long saleId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private String status;
    @Column(name = "transaction_uuid", nullable = false, unique = true) private String transactionUuid;
    @Column(name = "booking_id") private String bookingId;
    @Column(name = "correlation_id") private String correlationId;
    @Column(name = "reference_code") private String referenceCode;
    @Column private String deeplink;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(name = "completed_at") private LocalDateTime completedAt;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
