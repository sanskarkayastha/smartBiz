package com.smartbiz.inventory.exception;

public class ImageStorageUnavailableException extends RuntimeException {
    public ImageStorageUnavailableException() {
        super("Product image uploads are not configured.");
    }
}
