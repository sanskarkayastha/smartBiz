package com.smartbiz.ai.dto;

import java.util.List;

public record InventoryExtractionResponse(
        String supplierName,
        List<ParsedProduct> products
) {}
