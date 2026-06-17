package com.smartbiz.ai.controller;

import com.smartbiz.ai.dto.*;
import com.smartbiz.ai.service.AiService;
import com.smartbiz.ai.service.ImportSessionService;
import com.smartbiz.ai.service.InsightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final ImportSessionService importSessionService;
    private final InsightService insightService;

    @PostMapping("/query")
    public ResponseEntity<AiQueryResponse> query(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody AiQueryRequest request) {
        AiQueryResponse response = aiService.answerQuery(
            userId, request.messages(), request.image(), request.mimeType(), request.fileText(), request.importSessionId()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/insights")
    public ResponseEntity<AiInsightResponse> insights(
            @RequestHeader("X-User-Id") Long userId) {
        String insight = aiService.getDailyInsight(userId);
        return ResponseEntity.ok(new AiInsightResponse(insight));
    }

    @GetMapping("/insight-cards")
    public ResponseEntity<List<InsightCard>> insightCards(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(insightService.buildInsightCards(userId));
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

    @PostMapping("/parse-sales-file")
    public ResponseEntity<ParseSalesFileResponse> parseSalesFile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody ParseSalesFileRequest request) {
        return ResponseEntity.ok(aiService.parseSalesFile(request));
    }

    @PostMapping("/import-sessions")
    public ResponseEntity<ImportSessionDTO> createImportSession(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody(required = false) CreateImportSessionRequest request) {
        return ResponseEntity.ok(importSessionService.createOrResumeSession(userId, request));
    }

    @GetMapping("/import-sessions/{id}")
    public ResponseEntity<ImportSessionDTO> getImportSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(importSessionService.getSession(userId, id));
    }

    @PostMapping("/import-sessions/{id}/artifacts")
    public ResponseEntity<ImportSessionDTO> addArtifact(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody ImportSessionArtifactRequest request) {
        return ResponseEntity.ok(importSessionService.addArtifact(userId, id, request));
    }

    @PostMapping("/import-sessions/{id}/analyze")
    public ResponseEntity<ImportSessionDTO> analyzeImportSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody(required = false) AnalyzeImportSessionRequest request) {
        return ResponseEntity.ok(importSessionService.analyzeSession(userId, id, request));
    }

    @PostMapping("/import-sessions/{id}/reconcile")
    public ResponseEntity<ImportSessionDTO> reconcileImportSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody ReconcileImportSessionRequest request) {
        return ResponseEntity.ok(importSessionService.reconcileSession(userId, id, request));
    }

    @PostMapping("/import-sessions/{id}/commit")
    public ResponseEntity<ImportSessionCommitResult> commitImportSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody(required = false) CommitImportSessionRequest request) {
        return ResponseEntity.ok(importSessionService.commitSession(userId, id, request));
    }

    @PostMapping("/import-sessions/{id}/close")
    public ResponseEntity<ImportSessionDTO> closeImportSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(importSessionService.closeSession(userId, id));
    }
}
