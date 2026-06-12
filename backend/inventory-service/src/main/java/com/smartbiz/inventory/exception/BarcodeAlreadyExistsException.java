package com.smartbiz.inventory.exception;

public class BarcodeAlreadyExistsException extends RuntimeException {
    public BarcodeAlreadyExistsException(String barcode) {
        super("Barcode already exists for this user: " + barcode);
    }
}
