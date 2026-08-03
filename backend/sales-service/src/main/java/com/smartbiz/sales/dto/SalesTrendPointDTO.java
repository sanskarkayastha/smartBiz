package com.smartbiz.sales.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SalesTrendPointDTO(
        LocalDateTime periodStart,
        BigDecimal revenue,
        long orders,
        long itemsSold
) {}
