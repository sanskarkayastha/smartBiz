package com.smartbiz.inventory.dto;

import com.smartbiz.inventory.model.Supplier;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SupplierDTO(
    Long id,
    Long userId,
    String name,
    String phone,
    String email,
    BigDecimal balanceOwed,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    int productCount,
    int totalUnits,
    int lowStockCount,
    int outOfStockCount
) {
    public static SupplierDTO from(Supplier s) {
        return new SupplierDTO(
            s.getId(), s.getUserId(), s.getName(),
            s.getPhone(), s.getEmail(), s.getBalanceOwed(),
            s.getNotes(), s.getCreatedAt(), s.getUpdatedAt(),
            0, 0, 0, 0
        );
    }

    public static SupplierDTO from(Supplier s, int productCount, int totalUnits, int lowStockCount, int outOfStockCount) {
        return new SupplierDTO(
            s.getId(), s.getUserId(), s.getName(),
            s.getPhone(), s.getEmail(), s.getBalanceOwed(),
            s.getNotes(), s.getCreatedAt(), s.getUpdatedAt(),
            productCount, totalUnits, lowStockCount, outOfStockCount
        );
    }
}
