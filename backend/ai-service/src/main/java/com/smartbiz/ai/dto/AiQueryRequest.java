package com.smartbiz.ai.dto;

import java.util.List;

public record AiQueryRequest(
    List<ChatMessage> messages,
    String image,
    String mimeType,
    String fileText
) {
    public record ChatMessage(String role, String text) {}
}
