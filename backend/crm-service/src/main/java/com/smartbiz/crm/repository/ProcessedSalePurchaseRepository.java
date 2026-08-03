package com.smartbiz.crm.repository;

import com.smartbiz.crm.model.ProcessedSalePurchase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedSalePurchaseRepository extends JpaRepository<ProcessedSalePurchase, Long> {
    boolean existsByUserIdAndSaleId(Long userId, Long saleId);
}
