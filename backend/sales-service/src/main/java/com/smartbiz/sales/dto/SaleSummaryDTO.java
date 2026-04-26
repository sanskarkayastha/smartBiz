package com.smartbiz.sales.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleSummaryDTO {
    private BigDecimal totalRevenue;
    private Long orderCount;
    private BigDecimal avgOrderValue;
}
