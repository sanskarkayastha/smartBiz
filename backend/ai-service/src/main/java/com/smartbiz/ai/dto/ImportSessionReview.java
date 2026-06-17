package com.smartbiz.ai.dto;

import java.util.List;
import java.util.Map;

public record ImportSessionReview(
        String mode,
        String sourceIntent,
        String supplierName,
        List<ImportReviewItem> candidateProducts,
        List<ParsedSale> candidateSales,
        List<ImportSalesReviewItem> candidateSaleItems,
        Map<String, List<ProductSuggestion>> matchSuggestions,
        Map<String, ProductResolutionRequest> resolutions,
        List<String> categorySuggestions,
        List<String> warnings,
        List<InsightCard> insightCards
) {}
