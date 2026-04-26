package com.smartbiz.sales.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryProductDTO {
    private Long id;
    private String name;
    private BigDecimal price;
    private Integer quantity;
    private String sku;
}
