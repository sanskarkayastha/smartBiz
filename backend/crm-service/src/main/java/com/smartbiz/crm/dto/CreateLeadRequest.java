package com.smartbiz.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateLeadRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String phone;
    private String email;
    private String stage = "NEW";
    private String source;
    private BigDecimal estimatedValue;
    private String notes;
    private LocalDate followUpDate;
}
