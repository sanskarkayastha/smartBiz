package com.smartbiz.ai.exception;

import com.smartbiz.payment.PlanAccessUnavailableException;
import com.smartbiz.payment.PlanLimitException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class PlanExceptionHandler {
    @ExceptionHandler(PlanLimitException.class)
    public ResponseEntity<Map<String, Object>> handleLimit(PlanLimitException e) {
        return ResponseEntity.status(402).body(Map.of("error", e.getMessage(), "code", e.getCode(),
            "feature", e.getFeature(), "used", e.getUsed(), "limit", e.getLimit(), "upgradePath", "/billing"));
    }

    @ExceptionHandler(PlanAccessUnavailableException.class)
    public ResponseEntity<Map<String, String>> handleUnavailable(PlanAccessUnavailableException e) {
        return ResponseEntity.status(503).body(Map.of("error", e.getMessage(), "code", "PLAN_SERVICE_UNAVAILABLE"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
