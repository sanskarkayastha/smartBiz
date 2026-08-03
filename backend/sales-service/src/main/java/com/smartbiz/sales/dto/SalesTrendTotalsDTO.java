package com.smartbiz.sales.dto;

import java.math.BigDecimal;

public record SalesTrendTotalsDTO(
        BigDecimal revenue,
        long orders,
        long itemsSold,
        BigDecimal averageOrderValue
) {}
