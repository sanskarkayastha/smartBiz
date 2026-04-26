package com.smartbiz.crm.dto;

import lombok.Data;

@Data
public class UpdateCustomerRequest {
    private String name;
    private String phone;
    private String email;
    private String address;
    private String leadStatus;
    private String notes;
}
