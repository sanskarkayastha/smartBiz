package com.smartbiz.auth.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateEmail(DuplicateEmailException e) {
        log.warn("Duplicate email attempt: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error(e.getMessage(), "DUPLICATE_EMAIL"));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleInvalidCredentials(InvalidCredentialsException e) {
        log.warn("Invalid credentials attempt");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error(e.getMessage(), "INVALID_CREDENTIALS"));
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<Map<String, String>> handleEmailNotVerified(EmailNotVerifiedException e) {
        log.warn("Blocked login for unverified email");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(e.getMessage(), "EMAIL_NOT_VERIFIED"));
    }

    @ExceptionHandler(VerificationCodeException.class)
    public ResponseEntity<Map<String, String>> handleVerificationCode(VerificationCodeException e) {
        log.warn("Verification code issue: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error(e.getMessage(), "INVALID_VERIFICATION_CODE"));
    }

    @ExceptionHandler(UnsupportedAuthProviderException.class)
    public ResponseEntity<Map<String, String>> handleUnsupportedProvider(UnsupportedAuthProviderException e) {
        log.warn("Unsupported auth provider: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error(e.getMessage(), "UNSUPPORTED_AUTH_PROVIDER"));
    }

    @ExceptionHandler(FeatureDisabledException.class)
    public ResponseEntity<Map<String, String>> handleFeatureDisabled(FeatureDisabledException e) {
        log.warn("Feature disabled: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error(e.getMessage(), "FEATURE_DISABLED"));
    }

    @ExceptionHandler(OAuthStateException.class)
    public ResponseEntity<Map<String, String>> handleOAuthState(OAuthStateException e) {
        log.warn("OAuth state issue: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error(e.getMessage(), "GOOGLE_AUTH_EXPIRED"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationError(MethodArgumentNotValidException e) {
        log.warn("Validation error: {}", e.getMessage());
        Map<String, Object> response = new HashMap<>();
        Map<String, String> errors = new HashMap<>();

        e.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );

        response.put("error", "Validation failed");
        response.put("code", "VALIDATION_ERROR");
        response.put("details", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGenericException(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Internal server error", "INTERNAL_ERROR"));
    }

    private Map<String, String> error(String message, String code) {
        Map<String, String> response = new HashMap<>();
        response.put("error", message);
        response.put("code", code);
        return response;
    }
}
