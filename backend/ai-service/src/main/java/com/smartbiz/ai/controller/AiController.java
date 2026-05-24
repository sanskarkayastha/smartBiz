package com.smartbiz.ai.controller;

import com.smartbiz.ai.dto.*;
import com.smartbiz.ai.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/query")
    public ResponseEntity<AiQueryResponse> query(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody AiQueryRequest request) {
        AiQueryResponse response = aiService.answerQuery(
            userId, request.messages(), request.image(), request.mimeType(), request.fileText()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/insights")
    public ResponseEntity<AiInsightResponse> insights(
            @RequestHeader("X-User-Id") Long userId) {
        String insight = aiService.getDailyInsight(userId);
        return ResponseEntity.ok(new AiInsightResponse(insight));
    }

    @PostMapping("/scan-invoice")
    public ResponseEntity<ScanInvoiceResponse> scanInvoice(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody ScanInvoiceRequest request) {
        return ResponseEntity.ok(aiService.scanInvoice(request));
    }

    @PostMapping("/parse-voice")
    public ResponseEntity<ParseVoiceResponse> parseVoice(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody ParseVoiceRequest request) {
        return ResponseEntity.ok(aiService.parseVoice(request));
    }
}
