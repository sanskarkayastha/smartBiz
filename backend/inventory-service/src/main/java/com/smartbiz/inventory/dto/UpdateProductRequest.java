package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record UpdateProductRequest(
    String name,
    String category,

    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    BigDecimal price,

    @Min(value = 0, message = "Quantity cannot be negative")
    Integer quantity,

    Integer reorderLevel,
    String supplier,
    String barcode,
    String imageUrl,
    BigDecimal costPrice
) {}
