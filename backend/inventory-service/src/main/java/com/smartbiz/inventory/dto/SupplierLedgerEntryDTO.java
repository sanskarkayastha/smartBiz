package com.smartbiz.inventory.dto;

import com.smartbiz.inventory.model.SupplierLedgerEntry;
import com.smartbiz.inventory.model.SupplierLedgerEntryType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SupplierLedgerEntryDTO(
    Long id,
    SupplierLedgerEntryType type,
    BigDecimal amount,
    Long productId,
    Integer quantity,
    BigDecimal unitCost,
    String note,
    LocalDateTime createdAt
) {
    public static SupplierLedgerEntryDTO from(SupplierLedgerEntry entry) {
        return new SupplierLedgerEntryDTO(
            entry.getId(),
            entry.getType(),
            entry.getAmount(),
            entry.getProductId(),
            entry.getQuantity(),
            entry.getUnitCost(),
            entry.getNote(),
            entry.getCreatedAt()
        );
    }
}
