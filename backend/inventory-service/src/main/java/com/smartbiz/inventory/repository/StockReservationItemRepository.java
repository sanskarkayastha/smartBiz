package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.StockReservationItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StockReservationItemRepository extends JpaRepository<StockReservationItem, Long> {
    List<StockReservationItem> findByReservationId(UUID reservationId);
}
