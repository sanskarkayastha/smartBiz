package com.smartbiz.ai.repository;

import com.smartbiz.ai.model.ImportArtifact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImportArtifactRepository extends JpaRepository<ImportArtifact, Long> {

    List<ImportArtifact> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    Optional<ImportArtifact> findFirstBySessionIdOrderByCreatedAtDesc(Long sessionId);
}
