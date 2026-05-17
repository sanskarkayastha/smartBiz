package com.smartbiz.inventory.dto;

import java.math.BigDecimal;

public record UpdateSupplierRequest(
    String phone,
    String email,
    BigDecimal balanceOwed,
    String notes
) {}
