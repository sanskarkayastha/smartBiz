package com.smartbiz.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateSaleRequest {

    private Long customerId;

    private String paymentMethod = "CASH";

    @NotEmpty(message = "Sale must have at least one item")
    @Valid
    private List<SaleItemRequest> items;
}
