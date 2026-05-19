package com.smartbiz.ai.dto;

import java.util.List;

public record AiQueryRequest(List<ChatMessage> messages) {
    public record ChatMessage(String role, String text) {}
}
