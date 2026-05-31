package com.smartbiz.crm.repository;

import com.smartbiz.crm.model.Lead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long> {
    List<Lead> findByUserIdOrderByCreatedAtDesc(Long userId);
    Page<Lead> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Optional<Lead> findByIdAndUserId(Long id, Long userId);
    List<Lead> findByUserIdAndStageOrderByCreatedAtDesc(Long userId, String stage);

    @Query("SELECT l FROM Lead l WHERE l.userId = :userId " +
           "AND (:search IS NULL OR LOWER(l.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(COALESCE(l.phone, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(COALESCE(l.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:stage IS NULL OR l.stage = :stage) " +
           "AND (:source IS NULL OR l.source = :source) " +
           "AND (:overdueOnly IS NULL OR :overdueOnly = false OR (l.followUpDate IS NOT NULL AND l.followUpDate < CURRENT_DATE)) " +
           "ORDER BY l.createdAt DESC")
    Page<Lead> findWithFilters(
        @Param("userId") Long userId,
        @Param("search") String search,
        @Param("stage") String stage,
        @Param("source") String source,
        @Param("overdueOnly") Boolean overdueOnly,
        Pageable pageable);
}
