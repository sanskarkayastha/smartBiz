package com.smartbiz.crm.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "processed_sale_purchases", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "sale_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProcessedSalePurchase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "sale_id", nullable = false) private Long saleId;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    @PrePersist
    void created() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
