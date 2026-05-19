package com.smartbiz.crm.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class LeadDTO {
    private Long id;
    private Long userId;
    private String name;
    private String phone;
    private String email;
    private String stage;
    private String source;
    private BigDecimal estimatedValue;
    private String notes;
    private LocalDate followUpDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
