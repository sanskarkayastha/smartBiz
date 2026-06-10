package com.smartbiz.ai.dto;

public record ParsedSaleItem(
        String productName,
        Double quantity,
        Double unitPrice
) {}
