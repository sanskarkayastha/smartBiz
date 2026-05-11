package com.smartbiz.ai.controller;

import com.smartbiz.ai.dto.AiInsightResponse;
import com.smartbiz.ai.dto.AiQueryRequest;
import com.smartbiz.ai.dto.AiQueryResponse;
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
        String response = aiService.answerQuery(userId, request.question());
        return ResponseEntity.ok(new AiQueryResponse(response));
    }

    @GetMapping("/insights")
    public ResponseEntity<AiInsightResponse> insights(
            @RequestHeader("X-User-Id") Long userId) {
        String insight = aiService.getDailyInsight(userId);
        return ResponseEntity.ok(new AiInsightResponse(insight));
    }
}
