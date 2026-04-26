package com.smartbiz.sales.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaleItemDTO {
    private Long id;
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}
