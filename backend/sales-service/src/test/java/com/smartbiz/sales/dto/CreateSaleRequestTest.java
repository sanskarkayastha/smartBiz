package com.smartbiz.sales.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CreateSaleRequestTest {

    @Test
    void setSaleDate_parsesMinutePrecisionTimestamp() {
        CreateSaleRequest request = new CreateSaleRequest();

        request.setSaleDate("2024-05-10T14:30");

        assertThat(request.getSaleDate()).isEqualTo(LocalDateTime.of(2024, 5, 10, 14, 30));
    }

    @Test
    void setSaleDate_parsesSecondPrecisionTimestamp() {
        CreateSaleRequest request = new CreateSaleRequest();

        request.setSaleDate("2024-05-10T14:30:45");

        assertThat(request.getSaleDate()).isEqualTo(LocalDateTime.of(2024, 5, 10, 14, 30, 45));
    }

    @Test
    void setSaleDate_parsesDateOnlyValue() {
        CreateSaleRequest request = new CreateSaleRequest();

        request.setSaleDate("2024-05-10");

        assertThat(request.getSaleDate()).isEqualTo(LocalDateTime.of(2024, 5, 10, 12, 0));
    }

    @Test
    void setSaleDate_rejectsInvalidValue() {
        CreateSaleRequest request = new CreateSaleRequest();

        assertThatThrownBy(() -> request.setSaleDate("10/05/2024 14:30"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("saleDate must use YYYY-MM-DD or YYYY-MM-DDTHH:mm");
    }
}
