package com.smartbiz.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbiz.ai.dto.CommitImportSessionRequest;
import com.smartbiz.ai.dto.ImportReviewItem;
import com.smartbiz.ai.dto.ImportSessionReview;
import com.smartbiz.ai.dto.ProductResolutionRequest;
import com.smartbiz.ai.dto.ReconcileImportSessionRequest;
import com.smartbiz.ai.model.ImportMode;
import com.smartbiz.ai.model.ImportSession;
import com.smartbiz.ai.model.ImportSessionStatus;
import com.smartbiz.ai.repository.ImportArtifactRepository;
import com.smartbiz.ai.repository.ImportSessionRepository;
import com.smartbiz.ai.repository.ProductAliasRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ImportSessionServiceTest {

    private final ImportSessionRepository sessionRepository = mock(ImportSessionRepository.class);
    private final ImportArtifactRepository artifactRepository = mock(ImportArtifactRepository.class);
    private final ProductAliasRepository aliasRepository = mock(ProductAliasRepository.class);
    private final RemoteBusinessClient remoteBusinessClient = mock(RemoteBusinessClient.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private ImportSessionService service;

    @BeforeEach
    void setUp() {
        service = new ImportSessionService(
                sessionRepository,
                artifactRepository,
                aliasRepository,
                objectMapper,
                mock(AiService.class),
                remoteBusinessClient,
                mock(InsightService.class)
        );
        when(artifactRepository.findBySessionIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        when(sessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(aliasRepository.findByUserIdAndNormalizedAlias(any(), any())).thenReturn(Optional.empty());
        when(remoteBusinessClient.getCategories(any())).thenReturn(List.of());
    }

    @Test
    void reconcileInventorySession_preservesReviewedQuantityRateAndSupplier() throws Exception {
        ImportSession session = sessionWithReview(defaultReview());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        ProductResolutionRequest edited = resolution(
                "CREATE_NEW", null, "Milk Powder", "Dairy", "Kathmandu Traders", 5, "72.50"
        );

        var result = service.reconcileSession(
                7L,
                10L,
                new ReconcileImportSessionRequest("Kathmandu Traders", List.of(edited))
        );

        assertThat(result.review().supplierName()).isEqualTo("Kathmandu Traders");
        assertThat(result.review().candidateProducts()).singleElement().satisfies(item -> {
            assertThat(item.sourceName()).isEqualTo("Milk Powder");
            assertThat(item.quantity()).isEqualTo(5.0);
            assertThat(item.rate()).isEqualTo(72.5);
            assertThat(item.supplier()).isEqualTo("Kathmandu Traders");
        });
        assertThat(result.review().resolutions().get("milk").quantity()).isEqualTo(5);
        assertThat(result.review().resolutions().get("milk").rate()).isEqualByComparingTo("72.50");
    }

    @Test
    void reconcileInventorySession_rejectsInvalidQuantity() throws Exception {
        ImportSession session = sessionWithReview(defaultReview());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        ProductResolutionRequest invalid = resolution(
                "CREATE_NEW", null, "Milk", "Dairy", null, 0, "50"
        );

        assertThatThrownBy(() -> service.reconcileSession(
                7L,
                10L,
                new ReconcileImportSessionRequest("", List.of(invalid))
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantity");
    }

    @Test
    void commitMatchedProduct_updatesReviewedDetailsAndStockWithoutRestockLedger() throws Exception {
        ProductResolutionRequest matched = resolution(
                "MATCH_EXISTING", 42L, "Inventory Milk", "Dairy", "Kathmandu Traders", 4, "68.25"
        );
        ImportSessionReview review = reviewWithResolution(matched);
        ImportSession session = sessionWithReview(review);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));

        service.commitSession(7L, 10L, new CommitImportSessionRequest("Kathmandu Traders"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> updateCaptor = ArgumentCaptor.forClass(Map.class);
        verify(remoteBusinessClient).updateProduct(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(42L), updateCaptor.capture());
        assertThat(updateCaptor.getValue()).containsEntry("category", "Dairy")
                .containsEntry("supplier", "Kathmandu Traders")
                .containsEntry("costPrice", new BigDecimal("68.25"));
        verify(remoteBusinessClient).adjustStock(7L, 42L, 4, "Import session #10");
    }

    @Test
    void commitNewProduct_usesReviewedNameQuantityCostCategoryAndSupplier() throws Exception {
        ProductResolutionRequest createdResolution = resolution(
                "CREATE_NEW", null, "Milk Powder", "Dairy", "Kathmandu Traders", 5, "72.50"
        );
        ImportSession session = sessionWithReview(reviewWithResolution(createdResolution));
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(remoteBusinessClient.createProduct(any(), any())).thenReturn(new RemoteBusinessClient.InventoryProduct(
                99L, 7L, "Milk Powder", null, "Dairy", new BigDecimal("72.50"),
                new BigDecimal("72.50"), 5, null, "Kathmandu Traders", null, null, false
        ));

        service.commitSession(7L, 10L, new CommitImportSessionRequest("Kathmandu Traders"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(remoteBusinessClient).createProduct(org.mockito.ArgumentMatchers.eq(7L), payloadCaptor.capture());
        assertThat(payloadCaptor.getValue())
                .containsEntry("name", "Milk Powder")
                .containsEntry("quantity", 5)
                .containsEntry("category", "Dairy")
                .containsEntry("supplier", "Kathmandu Traders")
                .containsEntry("costPrice", new BigDecimal("72.5"));
    }

    private ImportSession sessionWithReview(ImportSessionReview review) throws Exception {
        return ImportSession.builder()
                .id(10L)
                .userId(7L)
                .status(ImportSessionStatus.REVIEWING)
                .mode(ImportMode.INVENTORY)
                .title("Bill import")
                .summary("Ready")
                .reviewJson(objectMapper.writeValueAsString(review))
                .lastActivityAt(LocalDateTime.now())
                .build();
    }

    private ImportSessionReview defaultReview() {
        return reviewWithResolution(resolution("CREATE_NEW", null, "Milk", "Dairy", null, 2, "50"));
    }

    private ImportSessionReview reviewWithResolution(ProductResolutionRequest resolution) {
        ImportReviewItem item = new ImportReviewItem(
                "milk", "Milk", "Dairy", resolution.supplier(),
                resolution.quantity(), resolution.rate().doubleValue(), 42L, "Inventory Milk"
        );
        return new ImportSessionReview(
                "INVENTORY",
                "PURCHASE_BILL",
                resolution.supplier(),
                List.of(item),
                List.of(),
                List.of(),
                Map.of("milk", List.of()),
                Map.of("milk", resolution),
                List.of("Dairy"),
                List.of(),
                List.of()
        );
    }

    private ProductResolutionRequest resolution(
            String action,
            Long productId,
            String productName,
            String category,
            String supplier,
            int quantity,
            String rate
    ) {
        return new ProductResolutionRequest(
                "milk",
                "Milk",
                action,
                productId,
                productName,
                category,
                supplier,
                quantity,
                new BigDecimal(rate),
                true,
                supplier != null
        );
    }
}
