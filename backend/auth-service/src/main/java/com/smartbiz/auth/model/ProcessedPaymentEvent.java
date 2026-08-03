package com.smartbiz.auth.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "processed_payment_events", uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "event_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProcessedPaymentEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String provider;
    @Column(name = "event_id", nullable = false) private String eventId;
    @CreationTimestamp @Column(name = "processed_at", nullable = false, updatable = false) private LocalDateTime processedAt;
}
