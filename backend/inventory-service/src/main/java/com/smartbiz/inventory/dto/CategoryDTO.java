package com.smartbiz.inventory.dto;

import com.smartbiz.inventory.model.Category;

public record CategoryDTO(Long id, String name) {

    public static CategoryDTO from(Category c) {
        return new CategoryDTO(c.getId(), c.getName());
    }
}
