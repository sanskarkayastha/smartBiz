package com.smartbiz.ai.dto;

public record ImportSalesReviewItem(
        String saleDate,
        String customerName,
        String paymentMethod,
        String normalizedName,
        String productName,
        double quantity,
        double unitPrice,
        Long matchedProductId,
        String matchedProductName
) {}
