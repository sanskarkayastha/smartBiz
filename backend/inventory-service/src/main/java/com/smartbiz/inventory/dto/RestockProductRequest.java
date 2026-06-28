package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RestockProductRequest(
    @NotNull(message = "Quantity added is required")
    @Min(value = 1, message = "Quantity added must be at least 1")
    Integer quantityAdded,

    @NotNull(message = "Unit cost is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit cost must be greater than 0")
    BigDecimal unitCost,

    String supplier,

    @NotNull(message = "Payment status is required")
    PaymentStatus paymentStatus,

    @DecimalMin(value = "0.0", inclusive = true, message = "Amount paid now cannot be negative")
    BigDecimal amountPaidNow,

    String note
) {}
