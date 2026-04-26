package com.smartbiz.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    @Column(nullable = false)
    private String type;

    private String reason;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
