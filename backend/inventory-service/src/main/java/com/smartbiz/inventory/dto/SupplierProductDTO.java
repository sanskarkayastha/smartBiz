package com.smartbiz.inventory.dto;

import java.math.BigDecimal;

public record SupplierProductDTO(
    Long id,
    String name,
    String sku,
    String category,
    BigDecimal price,
    Integer quantity
) {}
