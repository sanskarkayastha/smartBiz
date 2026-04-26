package com.smartbiz.sales.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockUpdateRequest {
    private Integer quantityChange;
    private String type;
    private String reason;
}
