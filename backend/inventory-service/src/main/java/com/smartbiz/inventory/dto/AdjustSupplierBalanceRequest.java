package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AdjustSupplierBalanceRequest(
    @NotNull(message = "Adjustment mode is required")
    SupplierAdjustmentMode mode,

    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than 0")
    BigDecimal amount,

    @DecimalMin(value = "0.0", inclusive = true, message = "Target balance cannot be negative")
    BigDecimal targetBalance,

    String note
) {}
