package com.smartbiz.ai.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "import_artifacts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportArtifact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ImportSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ImportArtifactKind kind;

    @Column(length = 255)
    private String label;

    @Column(name = "normalized_text", columnDefinition = "TEXT")
    private String normalizedText;

    @Column(name = "extracted_json", columnDefinition = "TEXT")
    private String extractedJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_intent", nullable = false, length = 32)
    private ImportSourceIntent sourceIntent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
