package com.smartbiz.auth.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record PlanCatalogResponse(List<Plan> plans) {
    public record Plan(
        String code,
        String name,
        List<Price> prices,
        List<String> features,
        Map<String, Integer> limits
    ) {}

    public record Price(String term, int days, BigDecimal amount, String currency) {}
}
