package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findAllByUserId(Long userId);
    Optional<Product> findByIdAndUserId(Long id, Long userId);
    Optional<Product> findByBarcodeAndUserId(String barcode, Long userId);
    boolean existsBySkuAndUserId(String sku, Long userId);

    @Query("SELECT p FROM Product p WHERE p.userId = :userId AND p.reorderLevel IS NOT NULL AND p.quantity <= p.reorderLevel")
    List<Product> findLowStockByUserId(Long userId);
}
