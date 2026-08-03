package com.smartbiz.sales.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import com.smartbiz.payment.PlanLimitException;
import com.smartbiz.payment.PlanAccessUnavailableException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SaleNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(SaleNotFoundException e) {
        return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, String>> handleInsufficientStock(InsufficientStockException e) {
        return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .findFirst()
                .orElse("Validation failed");
        return ResponseEntity.status(400).body(Map.of("error", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(PaymentException.class)
    public ResponseEntity<Map<String, String>> handlePayment(PaymentException e) {
        return ResponseEntity.status(400).body(Map.of("error", e.getMessage(), "code", "PAYMENT_ERROR"));
    }

    @ExceptionHandler(PlanLimitException.class)
    public ResponseEntity<Map<String, Object>> handlePlanLimit(PlanLimitException e) {
        return ResponseEntity.status(402).body(Map.of("error", e.getMessage(), "code", e.getCode(),
            "feature", e.getFeature(), "used", e.getUsed(), "limit", e.getLimit(), "upgradePath", "/billing"));
    }

    @ExceptionHandler(PlanAccessUnavailableException.class)
    public ResponseEntity<Map<String, String>> handlePlanUnavailable(PlanAccessUnavailableException e) {
        return ResponseEntity.status(503).body(Map.of("error", e.getMessage(), "code", "PLAN_SERVICE_UNAVAILABLE"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleQueryTypeMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.status(400).body(Map.of("error", "Invalid query parameter: " + e.getName()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
    }
}
