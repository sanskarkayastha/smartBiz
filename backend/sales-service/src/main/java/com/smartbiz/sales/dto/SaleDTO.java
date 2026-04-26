package com.smartbiz.sales.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class SaleDTO {
    private Long id;
    private Long userId;
    private Long customerId;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private String status;
    private LocalDateTime saleDate;
    private LocalDateTime createdAt;
    private List<SaleItemDTO> items;
}
