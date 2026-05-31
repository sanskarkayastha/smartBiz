package com.smartbiz.crm.repository;

import com.smartbiz.crm.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT c FROM Customer c WHERE c.userId = :userId " +
           "AND (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(COALESCE(c.phone, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:hasDue IS NULL OR :hasDue = false OR c.dueAmount > 0) " +
           "ORDER BY c.createdAt DESC")
    Page<Customer> findWithFilters(
        @Param("userId") Long userId,
        @Param("search") String search,
        @Param("hasDue") Boolean hasDue,
        Pageable pageable);
}
