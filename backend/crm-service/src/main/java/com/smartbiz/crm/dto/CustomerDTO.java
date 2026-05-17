package com.smartbiz.crm.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CustomerDTO {
    private Long id;
    private Long userId;
    private String name;
    private String phone;
    private String email;
    private String address;
    private String leadStatus;
    private String notes;
    private BigDecimal totalPurchases;
    private BigDecimal dueAmount;
    private LocalDateTime lastPurchaseDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
