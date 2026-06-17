package com.smartbiz.ai.dto;

public record ImportReviewItem(
        String normalizedName,
        String sourceName,
        String category,
        String supplier,
        double quantity,
        double rate,
        Long matchedProductId,
        String matchedProductName
) {}
