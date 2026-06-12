package com.smartbiz.ai.dto;

import java.util.List;

public record AiQueryResponse(
        String response,
        List<ParsedProduct> products,
        List<ParsedSale> sales
) {}
