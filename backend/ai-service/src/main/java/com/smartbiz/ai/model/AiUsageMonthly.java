package com.smartbiz.ai.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_monthly", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "period_start"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AiUsageMonthly {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "period_start", nullable = false) private LocalDate periodStart;
    @Column(name = "request_count", nullable = false) private Integer requestCount;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
