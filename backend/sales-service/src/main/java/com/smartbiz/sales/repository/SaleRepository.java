package com.smartbiz.sales.repository;

import com.smartbiz.sales.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Sale> findByIdAndUserId(Long id, Long userId);

    List<Sale> findByUserIdAndSaleDateBetween(Long userId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.userId = :userId AND s.saleDate BETWEEN :start AND :end")
    BigDecimal sumRevenueByUserIdAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.userId = :userId AND s.saleDate BETWEEN :start AND :end")
    Long countByUserIdAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
