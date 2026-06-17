package com.smartbiz.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Data
public class CreateSaleRequest {
    private static final List<DateTimeFormatter> SALE_DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")
    );

    private Long customerId;
    private String customerName;

    private String paymentMethod = "CASH";

    private String saleDate;

    @NotEmpty(message = "Sale must have at least one item")
    @Valid
    private List<SaleItemRequest> items;

    public LocalDateTime parseSaleDate() {
        if (saleDate == null || saleDate.isBlank()) {
            return null;
        }

        for (DateTimeFormatter formatter : SALE_DATE_FORMATTERS) {
            try {
                return LocalDateTime.parse(saleDate, formatter);
            } catch (DateTimeParseException ignored) {
                // Try the next accepted format.
            }
        }

        try {
            return LocalDate.parse(saleDate, DateTimeFormatter.ISO_LOCAL_DATE).atTime(12, 0);
        } catch (DateTimeParseException ignored) {
            throw new IllegalArgumentException("saleDate must use YYYY-MM-DD or YYYY-MM-DDTHH:mm");
        }
    }
}
