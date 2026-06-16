package com.smartbiz.inventory.dto;

import java.math.BigDecimal;

public record SupplierSummaryDTO(
    int totalSuppliers,
    long suppliersWithBalance,
    BigDecimal totalBalanceOwed,
    int linkedProducts,
    int suppliersNeedingRestock,
    int lowStockProducts,
    int outOfStockProducts
) {}
