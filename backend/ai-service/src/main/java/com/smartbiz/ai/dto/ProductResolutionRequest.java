package com.smartbiz.ai.dto;

import java.math.BigDecimal;

public record ProductResolutionRequest(
        String normalizedName,
        String sourceName,
        String action,
        Long productId,
        String productName,
        String category,
        String supplier,
        Integer quantity,
        BigDecimal rate,
        Boolean createCategory,
        Boolean createSupplier
) {}
