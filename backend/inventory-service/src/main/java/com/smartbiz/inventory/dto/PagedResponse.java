package com.smartbiz.inventory.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record PagedResponse<T>(
    List<T> content,
    int currentPage,
    int totalPages,
    long totalElements,
    boolean hasNext
) {
    public static <T> PagedResponse<T> of(Page<T> page) {
        return new PagedResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getTotalPages(),
            page.getTotalElements(),
            page.hasNext()
        );
    }
}
