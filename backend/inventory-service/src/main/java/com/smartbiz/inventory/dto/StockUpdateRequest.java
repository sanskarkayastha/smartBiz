package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockUpdateRequest(
    @NotNull(message = "Quantity change is required")
    Integer quantityChange,

    @NotBlank(message = "Type is required")
    String type,

    String reason
) {}
