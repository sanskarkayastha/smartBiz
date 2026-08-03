package com.smartbiz.sales.dto;

import java.time.LocalDate;
import java.util.List;

public record SalesTrendDTO(
        LocalDate from,
        LocalDate to,
        AnalyticsBucket bucket,
        SalesTrendTotalsDTO totals,
        List<SalesTrendPointDTO> points
) {}
