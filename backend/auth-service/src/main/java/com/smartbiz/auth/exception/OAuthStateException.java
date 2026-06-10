package com.smartbiz.auth.exception;

public class OAuthStateException extends RuntimeException {
    public OAuthStateException(String message) {
        super(message);
    }
}
