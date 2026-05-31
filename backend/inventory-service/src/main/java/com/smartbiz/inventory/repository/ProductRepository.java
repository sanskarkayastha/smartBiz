package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findAllByUserId(Long userId);
    Page<Product> findAllByUserId(Long userId, Pageable pageable);
    Optional<Product> findByIdAndUserId(Long id, Long userId);
    Optional<Product> findByBarcodeAndUserId(String barcode, Long userId);
    boolean existsBySkuAndUserId(String sku, Long userId);

    List<Product> findByUserIdAndSupplierIgnoreCase(Long userId, String supplier);

    @Query("SELECT p FROM Product p WHERE p.userId = :userId AND p.reorderLevel IS NOT NULL AND p.quantity <= p.reorderLevel")
    List<Product> findLowStockByUserId(Long userId);

    @Query("SELECT p FROM Product p WHERE p.userId = :userId " +
           "AND (:search = '' OR LOWER(p.name) LIKE CONCAT('%', :search, '%') " +
           "     OR LOWER(COALESCE(p.sku, '')) LIKE CONCAT('%', :search, '%') " +
           "     OR LOWER(COALESCE(p.category, '')) LIKE CONCAT('%', :search, '%')) " +
           "AND (:category = '' OR LOWER(COALESCE(p.category, '')) = :category) " +
           "AND (:stockStatus = '' " +
           "     OR (:stockStatus = 'OUT_OF_STOCK' AND p.quantity = 0) " +
           "     OR (:stockStatus = 'LOW_STOCK' AND p.quantity > 0 AND p.quantity <= p.reorderLevel))")
    Page<Product> findWithFilters(
        @Param("userId") Long userId,
        @Param("search") String search,
        @Param("category") String category,
        @Param("stockStatus") String stockStatus,
        Pageable pageable);
}
