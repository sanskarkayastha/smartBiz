package com.smartbiz.ai.dto;

import java.util.List;

public record ParseVoiceResponse(String intent, ParsedLead lead, List<ParsedProduct> products) {}
