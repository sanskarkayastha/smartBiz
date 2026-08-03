package com.smartbiz.inventory.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stock_reservations")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StockReservation {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false) private String status;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
