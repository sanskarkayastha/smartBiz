package com.smartbiz.ai.dto;

import java.util.List;

public record ReconcileImportSessionRequest(
        String supplierName,
        List<ProductResolutionRequest> resolutions
) {}
