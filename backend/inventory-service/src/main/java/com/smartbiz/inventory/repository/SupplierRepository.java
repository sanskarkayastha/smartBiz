package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findAllByUserIdOrderByNameAsc(Long userId);
    Page<Supplier> findAllByUserIdOrderByNameAsc(Long userId, Pageable pageable);
    Optional<Supplier> findByUserIdAndNameIgnoreCase(Long userId, String name);
    Optional<Supplier> findByIdAndUserId(Long id, Long userId);
}
