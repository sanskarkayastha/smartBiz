package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findAllByUserIdOrderByNameAsc(Long userId);
    Page<Supplier> findAllByUserIdOrderByNameAsc(Long userId, Pageable pageable);
    Optional<Supplier> findByUserIdAndNameIgnoreCase(Long userId, String name);
    Optional<Supplier> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT s FROM Supplier s WHERE s.userId = :userId " +
           "AND (:search = '' OR LOWER(s.name) LIKE CONCAT('%', :search, '%') " +
           "     OR LOWER(COALESCE(s.phone, '')) LIKE CONCAT('%', :search, '%') " +
           "     OR LOWER(COALESCE(s.email, '')) LIKE CONCAT('%', :search, '%')) " +
           "AND (:hasBalance = false OR s.balanceOwed > 0) " +
           "ORDER BY s.name ASC")
    Page<Supplier> findWithFilters(
        @Param("userId") Long userId,
        @Param("search") String search,
        @Param("hasBalance") boolean hasBalance,
        Pageable pageable);
}
