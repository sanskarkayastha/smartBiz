package com.smartbiz.sales.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CreateSaleRequestTest {

    @Test
    void parseSaleDate_parsesMinutePrecisionTimestamp() {
        CreateSaleRequest request = new CreateSaleRequest();

        request.setSaleDate("2024-05-10T14:30");

        assertThat(request.parseSaleDate()).isEqualTo(LocalDateTime.of(2024, 5, 10, 14, 30));
    }

    @Test
    void parseSaleDate_parsesSecondPrecisionTimestamp() {
        CreateSaleRequest request = new CreateSaleRequest();

        request.setSaleDate("2024-05-10T14:30:45");

        assertThat(request.parseSaleDate()).isEqualTo(LocalDateTime.of(2024, 5, 10, 14, 30, 45));
    }

    @Test
    void parseSaleDate_parsesDateOnlyValue() {
        CreateSaleRequest request = new CreateSaleRequest();

        request.setSaleDate("2024-05-10");

        assertThat(request.parseSaleDate()).isEqualTo(LocalDateTime.of(2024, 5, 10, 12, 0));
    }

    @Test
    void parseSaleDate_rejectsInvalidValue() {
        CreateSaleRequest request = new CreateSaleRequest();
        request.setSaleDate("10/05/2024 14:30");

        assertThatThrownBy(request::parseSaleDate)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("saleDate must use YYYY-MM-DD or YYYY-MM-DDTHH:mm");
    }
}
