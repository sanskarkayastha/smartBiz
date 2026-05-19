package com.smartbiz.crm.repository;

import com.smartbiz.crm.model.Lead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long> {
    List<Lead> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Lead> findByIdAndUserId(Long id, Long userId);
    List<Lead> findByUserIdAndStageOrderByCreatedAtDesc(Long userId, String stage);
}
