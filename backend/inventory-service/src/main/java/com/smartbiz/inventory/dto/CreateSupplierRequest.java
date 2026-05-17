package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record CreateSupplierRequest(
    @NotBlank String name,
    String phone,
    String email,
    BigDecimal balanceOwed,
    String notes
) {}
