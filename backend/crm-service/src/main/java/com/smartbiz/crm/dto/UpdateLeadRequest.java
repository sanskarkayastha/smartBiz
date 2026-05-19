package com.smartbiz.crm.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateLeadRequest {
    private String name;
    private String phone;
    private String email;
    private String stage;
    private String source;
    private BigDecimal estimatedValue;
    private String notes;
    private LocalDate followUpDate;
}
