package com.smartbiz.ai.dto;

import java.util.List;

public record ScanInvoiceResponse(List<ParsedProduct> products) {}
