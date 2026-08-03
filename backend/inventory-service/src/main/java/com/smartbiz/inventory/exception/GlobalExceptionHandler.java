package com.smartbiz.inventory.exception;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;
import com.smartbiz.payment.PlanLimitException;
import com.smartbiz.payment.PlanAccessUnavailableException;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(ProductNotFoundException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, String>> handleInsufficientStock(InsufficientStockException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(CategoryAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateCategory(CategoryAlreadyExistsException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(BarcodeAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateBarcode(BarcodeAlreadyExistsException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleEntityNotFound(EntityNotFoundException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(ImageStorageUnavailableException.class)
    public ResponseEntity<Map<String, String>> handleImageStorageUnavailable(ImageStorageUnavailableException e) {
        log.warn(e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getFieldErrors().forEach(err ->
            errors.put(err.getField(), err.getDefaultMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "Validation failed", "details", errors));
    }

    @ExceptionHandler(PlanLimitException.class)
    public ResponseEntity<Map<String, Object>> handlePlanLimit(PlanLimitException e) {
        return ResponseEntity.status(402).body(Map.of(
            "error", e.getMessage(), "code", e.getCode(), "feature", e.getFeature(),
            "used", e.getUsed(), "limit", e.getLimit(), "upgradePath", "/billing"
        ));
    }

    @ExceptionHandler(PlanAccessUnavailableException.class)
    public ResponseEntity<Map<String, String>> handlePlanUnavailable(PlanAccessUnavailableException e) {
        return ResponseEntity.status(503).body(Map.of("error", e.getMessage(), "code", "PLAN_SERVICE_UNAVAILABLE"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "Internal server error"));
    }
}
