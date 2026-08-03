package com.smartbiz.sales.repository;

import com.smartbiz.sales.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Sale> findByUserIdOrderBySaleDateDesc(Long userId);

    Optional<Sale> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Sale s WHERE s.id = :id AND s.userId = :userId")
    Optional<Sale> findLockedByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    List<Sale> findByUserIdAndSaleDateBetween(Long userId, LocalDateTime start, LocalDateTime end);

    List<Sale> findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );

    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.userId = :userId AND s.saleDate >= :start AND s.saleDate < :end AND s.status IN ('COMPLETED', 'IMPORTED')")
    BigDecimal sumRevenueByUserIdAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.userId = :userId AND s.saleDate >= :start AND s.saleDate < :end AND s.paymentMethod = 'DUE' AND s.status = 'COMPLETED'")
    BigDecimal sumDueByUserIdAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.userId = :userId AND s.saleDate >= :start AND s.saleDate < :end AND s.status IN ('COMPLETED', 'IMPORTED')")
    Long countByUserIdAndDateRange(@Param("userId") Long userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.userId = :userId AND s.saleDate >= :start AND s.saleDate < :end AND s.status IN ('COMPLETED', 'PAYMENT_PENDING', 'PAYMENT_REVIEW')")
    long countQuotaSales(@Param("userId") Long userId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
