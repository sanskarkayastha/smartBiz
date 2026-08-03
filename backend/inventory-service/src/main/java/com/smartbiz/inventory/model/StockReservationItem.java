package com.smartbiz.inventory.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "stock_reservation_items", uniqueConstraints = @UniqueConstraint(columnNames = {"reservation_id", "product_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StockReservationItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "reservation_id", nullable = false) private UUID reservationId;
    @Column(name = "product_id", nullable = false) private Long productId;
    @Column(nullable = false) private Integer quantity;
}
