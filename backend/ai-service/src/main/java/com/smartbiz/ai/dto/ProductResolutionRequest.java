package com.smartbiz.ai.dto;

public record ProductResolutionRequest(
        String normalizedName,
        String sourceName,
        String action,
        Long productId,
        String productName,
        String category,
        String supplier,
        Boolean createCategory,
        Boolean createSupplier
) {}
