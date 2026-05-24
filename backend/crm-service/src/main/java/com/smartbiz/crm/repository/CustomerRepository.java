package com.smartbiz.crm.repository;

import com.smartbiz.crm.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findByUserIdOrderByCreatedAtDesc(Long userId);
    Page<Customer> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<Customer> findByIdAndUserId(Long id, Long userId);

    Optional<Customer> findByUserIdAndPhone(Long userId, String phone);
    Optional<Customer> findByUserIdAndNameIgnoreCase(Long userId, String name);
    List<Customer> findByUserIdAndDueAmountGreaterThan(Long userId, java.math.BigDecimal amount);
}
