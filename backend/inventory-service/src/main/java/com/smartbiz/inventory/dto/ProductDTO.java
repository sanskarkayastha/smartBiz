package com.smartbiz.inventory.dto;

import com.smartbiz.inventory.model.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductDTO(
    Long id,
    Long userId,
    String name,
    String sku,
    String category,
    BigDecimal price,
    Integer quantity,
    Integer reorderLevel,
    String supplier,
    String barcode,
    String imageUrl,
    boolean lowStock,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static ProductDTO from(Product p) {
        boolean isLowStock = p.getReorderLevel() != null && p.getQuantity() <= p.getReorderLevel();
        return new ProductDTO(
            p.getId(), p.getUserId(), p.getName(), p.getSku(), p.getCategory(),
            p.getPrice(), p.getQuantity(), p.getReorderLevel(), p.getSupplier(),
            p.getBarcode(), p.getImageUrl(), isLowStock, p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
