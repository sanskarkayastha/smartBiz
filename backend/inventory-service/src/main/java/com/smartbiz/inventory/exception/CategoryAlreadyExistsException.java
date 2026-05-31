package com.smartbiz.inventory.exception;

public class CategoryAlreadyExistsException extends RuntimeException {
    public CategoryAlreadyExistsException(String name) {
        super("Category already exists: " + name);
    }
}
