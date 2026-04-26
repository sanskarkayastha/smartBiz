package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.StockHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockHistoryRepository extends JpaRepository<StockHistory, Long> {
    List<StockHistory> findAllByProductIdOrderByCreatedAtDesc(Long productId);
}
