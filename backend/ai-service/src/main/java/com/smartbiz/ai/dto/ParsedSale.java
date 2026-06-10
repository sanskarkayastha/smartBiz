package com.smartbiz.ai.dto;

import java.util.List;

public record ParsedSale(
        String saleDate,
        String customerName,
        String paymentMethod,
        List<ParsedSaleItem> items
) {}
