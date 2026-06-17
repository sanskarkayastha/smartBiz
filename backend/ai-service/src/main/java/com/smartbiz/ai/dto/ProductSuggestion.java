package com.smartbiz.ai.dto;

public record ProductSuggestion(
        Long productId,
        String productName,
        String category,
        String supplier,
        double score,
        String reason
) {}
