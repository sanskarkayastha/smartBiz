package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByUserIdOrderByNameAsc(Long userId);

    boolean existsByUserIdAndNameIgnoreCase(Long userId, String name);
}
