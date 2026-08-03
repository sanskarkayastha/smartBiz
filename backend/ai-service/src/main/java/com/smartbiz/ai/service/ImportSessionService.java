package com.smartbiz.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbiz.ai.dto.*;
import com.smartbiz.ai.model.*;
import com.smartbiz.ai.repository.ImportArtifactRepository;
import com.smartbiz.ai.repository.ImportSessionRepository;
import com.smartbiz.ai.repository.ProductAliasRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportSessionService {

    private final ImportSessionRepository importSessionRepository;
    private final ImportArtifactRepository importArtifactRepository;
    private final ProductAliasRepository productAliasRepository;
    private final ObjectMapper objectMapper;
    private final AiService aiService;
    private final RemoteBusinessClient remoteBusinessClient;
    private final InsightService insightService;

    @Transactional
    public ImportSessionDTO createOrResumeSession(Long userId, CreateImportSessionRequest request) {
        boolean startOver = request != null && Boolean.TRUE.equals(request.startOver());
        ImportMode requestedMode = parseMode(request != null ? request.mode() : null);
        if (!startOver) {
            Optional<ImportSession> existing = importSessionRepository.findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(
                    userId,
                    List.of(ImportSessionStatus.ACTIVE, ImportSessionStatus.REVIEWING)
            );
            if (existing.isPresent() && existing.get().getMode() == requestedMode) {
                touch(existing.get());
                return toDto(existing.get(), loadReview(existing.get()));
            }
        }

        ImportMode mode = requestedMode;
        ImportSession session = ImportSession.builder()
                .userId(userId)
                .status(ImportSessionStatus.ACTIVE)
                .mode(mode)
                .title(request != null && request.title() != null && !request.title().isBlank()
                        ? request.title().trim()
                        : defaultTitle(mode))
                .summary("Upload a file or bill photo to begin this import session.")
                .lastActivityAt(LocalDateTime.now())
                .build();
        return toDto(importSessionRepository.save(session), null);
    }

    @Transactional(readOnly = true)
    public ImportSessionDTO getSession(Long userId, Long sessionId) {
        ImportSession session = getOwnedSession(userId, sessionId);
        return toDto(session, loadReview(session));
    }

    @Transactional
    public ImportSessionDTO addArtifact(Long userId, Long sessionId, ImportSessionArtifactRequest request) {
        ImportSession session = getOwnedSession(userId, sessionId);
        ImportArtifactKind kind = parseArtifactKind(request.kind());
        String extractedJson = null;
        String normalizedText = normalizeArtifactText(request.fileText());
        if (kind == ImportArtifactKind.IMAGE && request.image() != null && !request.image().isBlank()) {
            InventoryExtractionResponse extraction = aiService.extractInventoryFromImage(request.image(), request.mimeType());
            extractedJson = writeJson(extraction);
            normalizedText = buildInventoryArtifactSummary(extraction);
        }
        ImportArtifact artifact = ImportArtifact.builder()
                .session(session)
                .kind(kind)
                .label(request.label())
                .normalizedText(normalizedText)
                .extractedJson(extractedJson)
                .sourceIntent(resolveIntent(session.getMode(), kind, request.sourceIntent()))
                .build();
        importArtifactRepository.save(artifact);
        session.setStatus(ImportSessionStatus.ACTIVE);
        session.setSummary("Artifact added. Ready for analysis.");
        touch(session);
        importSessionRepository.save(session);
        return toDto(session, loadReview(session));
    }

    @Transactional
    public ImportSessionDTO analyzeSession(Long userId, Long sessionId, AnalyzeImportSessionRequest request) {
        ImportSession session = getOwnedSession(userId, sessionId);
        ImportArtifact artifact = resolveArtifact(sessionId, request != null ? request.artifactId() : null);

        ImportSessionReview review = buildReview(userId, session, artifact);

        session.setStatus(ImportSessionStatus.REVIEWING);
        session.setAnalysisJson(writeJson(review));
        session.setReviewJson(writeJson(review));
        session.setSummary(buildSummary(review));
        touch(session);
        importSessionRepository.save(session);

        return toDto(session, review);
    }

    @Transactional
    public ImportSessionDTO reconcileSession(Long userId, Long sessionId, ReconcileImportSessionRequest request) {
        ImportSession session = getOwnedSession(userId, sessionId);
        ImportSessionReview review = requireReview(session);

        Map<String, ProductResolutionRequest> mergedResolutions = new LinkedHashMap<>(review.resolutions() != null
                ? review.resolutions()
                : Map.of());
        if (request != null && request.resolutions() != null) {
            for (ProductResolutionRequest resolution : request.resolutions()) {
                if (resolution == null || resolution.normalizedName() == null || resolution.normalizedName().isBlank()) {
                    continue;
                }
                if (session.getMode() == ImportMode.INVENTORY) {
                    validateInventoryResolution(resolution);
                }
                mergedResolutions.put(resolution.normalizedName(), resolution);
            }
        }

        String supplierName = review.supplierName();
        if (request != null && request.supplierName() != null) {
            supplierName = blankToNull(request.supplierName());
        }
        final String resolvedSupplierName = supplierName;

        List<ImportReviewItem> updatedProducts = review.candidateProducts() == null
                ? List.of()
                : review.candidateProducts().stream()
                .map(item -> applyProductResolution(item, mergedResolutions.get(item.normalizedName()), resolvedSupplierName))
                .toList();

        List<ImportSalesReviewItem> updatedSaleItems = review.candidateSaleItems() == null
                ? List.of()
                : review.candidateSaleItems().stream()
                .map(item -> applySaleResolution(item, mergedResolutions.get(item.normalizedName())))
                .toList();

        ImportSessionReview updatedReview = new ImportSessionReview(
                review.mode(),
                review.sourceIntent(),
                resolvedSupplierName,
                updatedProducts,
                review.candidateSales(),
                updatedSaleItems,
                review.matchSuggestions(),
                mergedResolutions,
                review.categorySuggestions(),
                review.warnings(),
                review.insightCards()
        );

        session.setReviewJson(writeJson(updatedReview));
        session.setSummary(buildSummary(updatedReview));
        touch(session);
        importSessionRepository.save(session);
        return toDto(session, updatedReview);
    }

    @Transactional
    public ImportSessionCommitResult commitSession(Long userId, Long sessionId, CommitImportSessionRequest request) {
        ImportSession session = getOwnedSession(userId, sessionId);
        ImportSessionReview review = requireReview(session);
        Map<String, ProductResolutionRequest> resolutions = review.resolutions() != null ? review.resolutions() : Map.of();
        String fallbackSupplier = request != null && request.supplierName() != null && !request.supplierName().isBlank()
                ? request.supplierName().trim()
                : review.supplierName();

        List<RemoteBusinessClient.CategoryRef> categories = remoteBusinessClient.getCategories(userId);
        Set<String> existingCategories = categories.stream()
                .map(category -> normalizeName(category.name()))
                .collect(Collectors.toCollection(HashSet::new));

        int createdProducts = 0;
        int updatedProducts = 0;
        int importedSales = 0;

        Map<String, RemoteBusinessClient.InventoryProduct> createdByNormalizedName = new HashMap<>();
        Set<String> createdInventoryNames = new HashSet<>();

        if (session.getMode() == ImportMode.INVENTORY) {
            for (ImportReviewItem item : groupCandidateProducts(review.candidateProducts())) {
                ProductResolutionRequest resolution = resolutions.get(item.normalizedName());
                if (resolution == null) {
                    continue;
                }
                if ("EXCLUDE".equalsIgnoreCase(resolution.action())) {
                    continue;
                }
                if ("MATCH_EXISTING".equalsIgnoreCase(resolution.action()) && resolution.productId() != null) {
                    String reviewedCategory = blankToNull(resolution.category());
                    String reviewedSupplier = blankToNull(resolution.supplier() != null ? resolution.supplier() : fallbackSupplier);
                    Map<String, Object> productUpdates = new LinkedHashMap<>();
                    if (resolution.rate() != null && resolution.rate().compareTo(BigDecimal.ZERO) > 0) {
                        productUpdates.put("costPrice", resolution.rate());
                    }
                    if (reviewedCategory != null) {
                        productUpdates.put("category", reviewedCategory);
                    }
                    if (reviewedSupplier != null) {
                        productUpdates.put("supplier", reviewedSupplier);
                    }
                    if (!productUpdates.isEmpty()) {
                        remoteBusinessClient.updateProduct(userId, resolution.productId(), productUpdates);
                    }
                    int reviewedQuantity = resolution.quantity() != null
                            ? resolution.quantity()
                            : (int) Math.round(item.quantity());
                    remoteBusinessClient.adjustStock(userId, resolution.productId(), reviewedQuantity, "Import session #" + sessionId);
                    updatedProducts++;
                    persistAlias(
                            userId,
                            item.sourceName(),
                            item.normalizedName(),
                            resolution.productId(),
                            resolution.productName() != null ? resolution.productName() : item.sourceName(),
                            reviewedCategory,
                            reviewedSupplier
                    );
                    continue;
                }

                RemoteBusinessClient.InventoryProduct created = createdByNormalizedName.computeIfAbsent(
                        item.normalizedName(),
                        key -> createProductForResolution(userId, item, resolution, fallbackSupplier, existingCategories)
                );
                if (createdInventoryNames.add(item.normalizedName())) {
                    createdProducts++;
                }
                persistAlias(userId, item.sourceName(), item.normalizedName(), created.id(), created.name(), created.category(), created.supplier());
            }
        } else {
            for (ProductResolutionRequest resolution : resolutions.values()) {
                if (resolution == null || !"CREATE_NEW".equalsIgnoreCase(resolution.action())) {
                    continue;
                }
                ImportSalesReviewItem sample = review.candidateSaleItems().stream()
                        .filter(item -> item.normalizedName().equals(resolution.normalizedName()))
                        .findFirst()
                        .orElse(null);
                if (sample == null) {
                    continue;
                }
                RemoteBusinessClient.InventoryProduct created = createdByNormalizedName.computeIfAbsent(
                        resolution.normalizedName(),
                        key -> createProductForSale(userId, sample, resolution, fallbackSupplier, existingCategories)
                );
                createdProducts++;
                persistAlias(userId, sample.productName(), sample.normalizedName(), created.id(), created.name(), created.category(), created.supplier());
            }

            List<Map<String, Object>> payloadSales = new ArrayList<>();
            for (ParsedSale sale : review.candidateSales()) {
                List<Map<String, Object>> items = new ArrayList<>();
                for (ParsedSaleItem item : sale.items()) {
                    String normalizedName = normalizeName(item.productName());
                    ProductResolutionRequest resolution = resolutions.get(normalizedName);
                    if (resolution == null || "EXCLUDE".equalsIgnoreCase(resolution.action())) {
                        continue;
                    }
                    Long productId = resolution.productId();
                    if (productId == null && "CREATE_NEW".equalsIgnoreCase(resolution.action())) {
                        RemoteBusinessClient.InventoryProduct created = createdByNormalizedName.get(normalizedName);
                        if (created != null) {
                            productId = created.id();
                        }
                    }
                    if (productId == null) {
                        continue;
                    }
                    Map<String, Object> itemPayload = new LinkedHashMap<>();
                    itemPayload.put("productId", productId);
                    itemPayload.put("quantity", (int) Math.round(item.quantity()));
                    itemPayload.put("unitPrice", BigDecimal.valueOf(item.unitPrice()));
                    items.add(itemPayload);
                    persistAlias(userId, item.productName(), normalizedName, productId, resolution.productName() != null ? resolution.productName() : item.productName(), resolution.category(), fallbackSupplier);
                }
                if (items.isEmpty()) {
                    continue;
                }
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("customerName", sale.customerName());
                payload.put("paymentMethod", sale.paymentMethod());
                payload.put("saleDate", sale.saleDate() + "T12:00:00");
                payload.put("items", items);
                payloadSales.add(payload);
            }
            importedSales = remoteBusinessClient.importSales(userId, payloadSales).size();
        }

        session.setStatus(ImportSessionStatus.COMPLETED);
        session.setClosedAt(LocalDateTime.now());
        session.setSummary(session.getMode() == ImportMode.SALES
                ? "Import completed. %d product records created and %d historical sales saved.".formatted(createdProducts, importedSales)
                : "Import completed. %d product records created and %d inventory updates saved.".formatted(createdProducts, updatedProducts));
        touch(session);
        importSessionRepository.save(session);

        return new ImportSessionCommitResult(
                session.getId(),
                session.getSummary(),
                createdProducts,
                updatedProducts,
                importedSales
        );
    }

    @Transactional
    public ImportSessionDTO closeSession(Long userId, Long sessionId) {
        ImportSession session = getOwnedSession(userId, sessionId);
        session.setStatus(ImportSessionStatus.CLOSED);
        session.setClosedAt(LocalDateTime.now());
        session.setSummary("Import session closed.");
        touch(session);
        return toDto(importSessionRepository.save(session), loadReview(session));
    }

    @Transactional(readOnly = true)
    public Optional<ImportSession> findActiveSession(Long userId, Long sessionId) {
        if (sessionId != null) {
            return Optional.of(getOwnedSession(userId, sessionId));
        }
        return importSessionRepository.findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(
                userId,
                List.of(ImportSessionStatus.ACTIVE, ImportSessionStatus.REVIEWING)
        );
    }

    private ImportSessionReview buildReview(Long userId, ImportSession session, ImportArtifact artifact) {
        List<RemoteBusinessClient.InventoryProduct> inventoryProducts = remoteBusinessClient.getInventoryProducts(userId);
        Map<String, ProductAlias> aliasesByName = productAliasRepository.findByUserIdAndNormalizedAliasIn(
                        userId,
                        inventoryProducts.stream().map(product -> normalizeName(product.name())).toList()
                ).stream()
                .collect(Collectors.toMap(ProductAlias::getNormalizedAlias, Function.identity(), (left, right) -> left));

        List<InsightCard> insightCards = insightService.buildInsightCards(userId);
        if (session.getMode() == ImportMode.SALES) {
            List<ParsedSale> sales = aiService.parseSalesFile(new ParseSalesFileRequest(artifact.getNormalizedText())).sales();
            List<ImportSalesReviewItem> saleItems = flattenSales(sales, inventoryProducts, userId);
            Map<String, List<ProductSuggestion>> suggestions = buildSuggestions(saleItems.stream()
                    .map(ImportSalesReviewItem::normalizedName)
                    .collect(Collectors.toCollection(LinkedHashSet::new)), inventoryProducts, aliasesByName);
            return new ImportSessionReview(
                    session.getMode().name(),
                    artifact.getSourceIntent().name(),
                    null,
                    List.of(),
                    sales,
                    saleItems,
                    suggestions,
                    defaultResolutionsFromSaleItems(saleItems),
                    List.of(),
                    sales.isEmpty() ? List.of("No historical sales could be extracted from this file.") : List.of(),
                    insightCards
            );
        }

        InventoryExtractionResponse extraction = artifact.getKind() == ImportArtifactKind.IMAGE
                ? readStoredExtraction(artifact.getExtractedJson())
                : aiService.extractInventoryFromText(artifact.getNormalizedText());
        List<ImportReviewItem> products = flattenProducts(extraction, inventoryProducts, userId);
        Map<String, List<ProductSuggestion>> suggestions = buildSuggestions(products.stream()
                .map(ImportReviewItem::normalizedName)
                .collect(Collectors.toCollection(LinkedHashSet::new)), inventoryProducts, aliasesByName);
        List<String> categorySuggestions = products.stream()
                .map(ImportReviewItem::category)
                .filter(Objects::nonNull)
                .filter(category -> !category.isBlank())
                .distinct()
                .toList();
        return new ImportSessionReview(
                session.getMode().name(),
                artifact.getSourceIntent().name(),
                extraction.supplierName(),
                products,
                List.of(),
                List.of(),
                suggestions,
                defaultResolutionsFromProducts(products),
                categorySuggestions,
                products.isEmpty() ? List.of("No inventory items could be extracted from this file.") : List.of(),
                insightCards
        );
    }

    private List<ImportSalesReviewItem> flattenSales(
            List<ParsedSale> sales,
            List<RemoteBusinessClient.InventoryProduct> inventoryProducts,
            Long userId
    ) {
        Map<String, ProductAlias> aliases = productAliasRepository.findByUserIdAndNormalizedAliasIn(
                        userId,
                        sales.stream()
                                .flatMap(sale -> sale.items().stream())
                                .map(item -> normalizeName(item.productName()))
                                .collect(Collectors.toSet())
                ).stream()
                .collect(Collectors.toMap(ProductAlias::getNormalizedAlias, Function.identity(), (left, right) -> left));

        return sales.stream()
                .flatMap(sale -> sale.items().stream().map(item -> {
                    String normalizedName = normalizeName(item.productName());
                    RemoteBusinessClient.InventoryProduct matched = findMatch(normalizedName, inventoryProducts, aliases.get(normalizedName));
                    return new ImportSalesReviewItem(
                            sale.saleDate(),
                            sale.customerName(),
                            sale.paymentMethod(),
                            normalizedName,
                            item.productName(),
                            item.quantity(),
                            item.unitPrice(),
                            matched != null ? matched.id() : null,
                            matched != null ? matched.name() : null
                    );
                }))
                .toList();
    }

    private List<ImportReviewItem> flattenProducts(
            InventoryExtractionResponse extraction,
            List<RemoteBusinessClient.InventoryProduct> inventoryProducts,
            Long userId
    ) {
        Map<String, ProductAlias> aliases = productAliasRepository.findByUserIdAndNormalizedAliasIn(
                        userId,
                        extraction.products().stream()
                                .map(product -> normalizeName(product.name()))
                                .collect(Collectors.toSet())
                ).stream()
                .collect(Collectors.toMap(ProductAlias::getNormalizedAlias, Function.identity(), (left, right) -> left));

        return extraction.products().stream()
                .map(product -> {
                    String normalizedName = normalizeName(product.name());
                    RemoteBusinessClient.InventoryProduct matched = findMatch(normalizedName, inventoryProducts, aliases.get(normalizedName));
                    return new ImportReviewItem(
                            normalizedName,
                            product.name(),
                            product.category(),
                            extraction.supplierName(),
                            product.quantity(),
                            product.rate(),
                            matched != null ? matched.id() : null,
                            matched != null ? matched.name() : null
                    );
                })
                .toList();
    }

    private Map<String, ProductResolutionRequest> defaultResolutionsFromProducts(List<ImportReviewItem> products) {
        Map<String, ProductResolutionRequest> defaults = new LinkedHashMap<>();
        for (ImportReviewItem item : groupCandidateProducts(products)) {
            defaults.putIfAbsent(item.normalizedName(), new ProductResolutionRequest(
                    item.normalizedName(),
                    item.sourceName(),
                    item.matchedProductId() != null ? "MATCH_EXISTING" : "CREATE_NEW",
                    item.matchedProductId(),
                    item.matchedProductName() != null ? item.matchedProductName() : item.sourceName(),
                    item.category(),
                    item.supplier(),
                    (int) Math.round(item.quantity()),
                    BigDecimal.valueOf(item.rate()),
                    Boolean.TRUE,
                    Boolean.TRUE
            ));
        }
        return defaults;
    }

    private List<ImportReviewItem> groupCandidateProducts(List<ImportReviewItem> products) {
        Map<String, ImportReviewItem> grouped = new LinkedHashMap<>();
        for (ImportReviewItem item : products) {
            grouped.merge(item.normalizedName(), item, (existing, duplicate) -> new ImportReviewItem(
                    existing.normalizedName(),
                    existing.sourceName(),
                    existing.category(),
                    existing.supplier(),
                    existing.quantity() + duplicate.quantity(),
                    existing.rate(),
                    existing.matchedProductId(),
                    existing.matchedProductName()
            ));
        }
        return new ArrayList<>(grouped.values());
    }

    private Map<String, ProductResolutionRequest> defaultResolutionsFromSaleItems(List<ImportSalesReviewItem> items) {
        Map<String, ProductResolutionRequest> defaults = new LinkedHashMap<>();
        for (ImportSalesReviewItem item : items) {
            defaults.putIfAbsent(item.normalizedName(), new ProductResolutionRequest(
                    item.normalizedName(),
                    item.productName(),
                    item.matchedProductId() != null ? "MATCH_EXISTING" : "CREATE_NEW",
                    item.matchedProductId(),
                    item.matchedProductName() != null ? item.matchedProductName() : item.productName(),
                    null,
                    null,
                    null,
                    null,
                    Boolean.FALSE,
                    Boolean.FALSE
            ));
        }
        return defaults;
    }

    private Map<String, List<ProductSuggestion>> buildSuggestions(
            Set<String> normalizedNames,
            List<RemoteBusinessClient.InventoryProduct> inventoryProducts,
            Map<String, ProductAlias> aliasesByName
    ) {
        Map<String, List<ProductSuggestion>> suggestions = new LinkedHashMap<>();
        for (String normalizedName : normalizedNames) {
            List<ProductSuggestion> ranked = new ArrayList<>();
            ProductAlias alias = aliasesByName.get(normalizedName);
            if (alias != null) {
                ranked.add(new ProductSuggestion(
                        alias.getProductId(),
                        alias.getProductName(),
                        alias.getCategory(),
                        alias.getSupplier(),
                        1.0,
                        "Previously approved alias"
                ));
            }
            for (RemoteBusinessClient.InventoryProduct product : inventoryProducts) {
                double score = similarity(normalizedName, normalizeName(product.name()));
                if (score < 0.45) {
                    continue;
                }
                String reason = score >= 0.99 ? "Exact inventory name" : "Similar inventory name";
                ranked.add(new ProductSuggestion(product.id(), product.name(), product.category(), product.supplier(), score, reason));
            }
            List<ProductSuggestion> deduped = ranked.stream()
                    .collect(Collectors.toMap(
                            ProductSuggestion::productId,
                            Function.identity(),
                            (left, right) -> left.score() >= right.score() ? left : right
                    ))
                    .values().stream()
                    .sorted(Comparator.comparingDouble(ProductSuggestion::score).reversed())
                    .limit(3)
                    .toList();
            suggestions.put(normalizedName, deduped);
        }
        return suggestions;
    }

    private ImportReviewItem applyProductResolution(ImportReviewItem item, ProductResolutionRequest resolution, String supplierName) {
        if (resolution == null) {
            return item;
        }
        return new ImportReviewItem(
                item.normalizedName(),
                resolution.productName() != null && "CREATE_NEW".equalsIgnoreCase(resolution.action()) ? resolution.productName() : item.sourceName(),
                resolution.category(),
                resolution.supplier() != null ? resolution.supplier() : supplierName,
                resolution.quantity() != null ? resolution.quantity() : item.quantity(),
                resolution.rate() != null ? resolution.rate().doubleValue() : item.rate(),
                "MATCH_EXISTING".equalsIgnoreCase(resolution.action()) ? resolution.productId() : null,
                "MATCH_EXISTING".equalsIgnoreCase(resolution.action()) ? resolution.productName() : null
        );
    }

    private ImportSalesReviewItem applySaleResolution(ImportSalesReviewItem item, ProductResolutionRequest resolution) {
        if (resolution == null) {
            return item;
        }
        return new ImportSalesReviewItem(
                item.saleDate(),
                item.customerName(),
                item.paymentMethod(),
                item.normalizedName(),
                item.productName(),
                item.quantity(),
                item.unitPrice(),
                "MATCH_EXISTING".equalsIgnoreCase(resolution.action()) ? resolution.productId() : null,
                "MATCH_EXISTING".equalsIgnoreCase(resolution.action()) ? resolution.productName() : resolution.productName()
        );
    }

    private RemoteBusinessClient.InventoryProduct createProductForResolution(
            Long userId,
            ImportReviewItem item,
            ProductResolutionRequest resolution,
            String fallbackSupplier,
            Set<String> existingCategories
    ) {
        String category = blankToNull(resolution.category());
        if (Boolean.TRUE.equals(resolution.createCategory()) && category != null && existingCategories.add(normalizeName(category))) {
            tryCreateCategory(userId, category);
        }
        String supplier = blankToNull(resolution.supplier() != null ? resolution.supplier() : fallbackSupplier);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", resolution.productName() != null ? resolution.productName() : item.sourceName());
        payload.put("price", BigDecimal.valueOf(item.rate() > 0 ? item.rate() : 1.0));
        payload.put("costPrice", BigDecimal.valueOf(item.rate()));
        payload.put("quantity", (int) Math.round(item.quantity()));
        if (category != null) {
            payload.put("category", category);
        }
        if (supplier != null) {
            payload.put("supplier", supplier);
        }
        return remoteBusinessClient.createProduct(userId, payload);
    }

    private RemoteBusinessClient.InventoryProduct createProductForSale(
            Long userId,
            ImportSalesReviewItem item,
            ProductResolutionRequest resolution,
            String fallbackSupplier,
            Set<String> existingCategories
    ) {
        String category = blankToNull(resolution.category());
        if (Boolean.TRUE.equals(resolution.createCategory()) && category != null && existingCategories.add(normalizeName(category))) {
            tryCreateCategory(userId, category);
        }
        String supplier = blankToNull(resolution.supplier() != null ? resolution.supplier() : fallbackSupplier);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", resolution.productName() != null ? resolution.productName() : item.productName());
        payload.put("price", BigDecimal.valueOf(item.unitPrice() > 0 ? item.unitPrice() : 1.0));
        payload.put("costPrice", BigDecimal.valueOf(item.unitPrice()));
        payload.put("quantity", 0);
        if (category != null) {
            payload.put("category", category);
        }
        if (supplier != null) {
            payload.put("supplier", supplier);
        }
        return remoteBusinessClient.createProduct(userId, payload);
    }

    private void tryCreateCategory(Long userId, String category) {
        try {
            remoteBusinessClient.createCategory(userId, category);
        } catch (Exception e) {
            log.debug("Category '{}' was not created during import: {}", category, e.getMessage());
        }
    }

    private void persistAlias(Long userId, String sourceName, String normalizedName, Long productId, String productName, String category, String supplier) {
        if (productId == null || normalizedName == null || normalizedName.isBlank()) {
            return;
        }
        ProductAlias alias = productAliasRepository.findByUserIdAndNormalizedAlias(userId, normalizedName)
                .orElse(ProductAlias.builder()
                        .userId(userId)
                        .aliasName(sourceName)
                        .normalizedAlias(normalizedName)
                        .build());
        alias.setAliasName(sourceName);
        alias.setProductId(productId);
        alias.setProductName(productName != null ? productName : sourceName);
        alias.setCategory(category);
        alias.setSupplier(supplier);
        productAliasRepository.save(alias);
    }

    private RemoteBusinessClient.InventoryProduct findMatch(
            String normalizedName,
            List<RemoteBusinessClient.InventoryProduct> inventoryProducts,
            ProductAlias alias
    ) {
        if (alias != null) {
            return inventoryProducts.stream()
                    .filter(product -> product.id().equals(alias.getProductId()))
                    .findFirst()
                    .orElse(null);
        }
        return inventoryProducts.stream()
                .filter(product -> normalizeName(product.name()).equals(normalizedName))
                .findFirst()
                .orElse(null);
    }

    private ImportSessionReview requireReview(ImportSession session) {
        ImportSessionReview review = loadReview(session);
        if (review == null) {
            throw new IllegalStateException("Analyze the session before reconciling or committing it.");
        }
        return review;
    }

    private ImportArtifact resolveArtifact(Long sessionId, Long artifactId) {
        if (artifactId != null) {
            return importArtifactRepository.findById(artifactId)
                    .filter(artifact -> artifact.getSession().getId().equals(sessionId))
                    .orElseThrow(() -> new IllegalArgumentException("Artifact not found for this session."));
        }
        return importArtifactRepository.findFirstBySessionIdOrderByCreatedAtDesc(sessionId)
                .orElseThrow(() -> new IllegalStateException("Attach a file before running analysis."));
    }

    private ImportSession getOwnedSession(Long userId, Long sessionId) {
        return importSessionRepository.findById(sessionId)
                .filter(session -> session.getUserId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Import session not found."));
    }

    private ImportSessionDTO toDto(ImportSession session, ImportSessionReview review) {
        List<ImportArtifactDTO> artifacts = importArtifactRepository.findBySessionIdOrderByCreatedAtAsc(session.getId()).stream()
                .map(artifact -> new ImportArtifactDTO(
                        artifact.getId(),
                        artifact.getKind().name(),
                        artifact.getLabel(),
                        artifact.getSourceIntent().name(),
                        artifact.getCreatedAt()
                ))
                .toList();

        return new ImportSessionDTO(
                session.getId(),
                session.getStatus().name(),
                session.getMode().name(),
                session.getTitle(),
                session.getSummary(),
                session.getLastActivityAt(),
                session.getClosedAt(),
                artifacts,
                review
        );
    }

    private ImportSessionReview loadReview(ImportSession session) {
        String json = session.getReviewJson() != null ? session.getReviewJson() : session.getAnalysisJson();
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, ImportSessionReview.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read import review state.", e);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to save import state.", e);
        }
    }

    private String buildSummary(ImportSessionReview review) {
        if ("SALES".equalsIgnoreCase(review.mode())) {
            int salesCount = review.candidateSales() != null ? review.candidateSales().size() : 0;
            long unresolved = review.candidateSaleItems() == null ? 0 : review.candidateSaleItems().stream()
                    .map(ImportSalesReviewItem::normalizedName)
                    .distinct()
                    .filter(name -> {
                        ProductResolutionRequest resolution = review.resolutions().get(name);
                        return resolution == null;
                    })
                    .count();
            return "Review %d historical sale%s and resolve %d product name%s before import."
                    .formatted(salesCount, salesCount == 1 ? "" : "s", unresolved, unresolved == 1 ? "" : "s");
        }
        int productCount = review.candidateProducts() != null ? review.candidateProducts().size() : 0;
        return "Review %d extracted inventory item%s before saving them to SmartBiz."
                .formatted(productCount, productCount == 1 ? "" : "s");
    }

    private void touch(ImportSession session) {
        session.setLastActivityAt(LocalDateTime.now());
    }

    private ImportMode parseMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return ImportMode.SALES;
        }
        return ImportMode.valueOf(mode.trim().toUpperCase(Locale.ENGLISH));
    }

    private ImportArtifactKind parseArtifactKind(String kind) {
        if (kind == null || kind.isBlank()) {
            return ImportArtifactKind.SHEET;
        }
        return ImportArtifactKind.valueOf(kind.trim().toUpperCase(Locale.ENGLISH));
    }

    private ImportSourceIntent resolveIntent(ImportMode mode, ImportArtifactKind kind, String requestedIntent) {
        if (requestedIntent != null && !requestedIntent.isBlank()) {
            return ImportSourceIntent.valueOf(requestedIntent.trim().toUpperCase(Locale.ENGLISH));
        }
        if (mode == ImportMode.SALES) {
            return ImportSourceIntent.HISTORICAL_SALES;
        }
        return kind == ImportArtifactKind.IMAGE ? ImportSourceIntent.PURCHASE_BILL : ImportSourceIntent.PRODUCT_LIST;
    }

    private String normalizeArtifactText(String fileText) {
        if (fileText == null) {
            return null;
        }
        String trimmed = fileText.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultTitle(ImportMode mode) {
        return mode == ImportMode.SALES ? "Historical sales import" : "Inventory import";
    }

    private InventoryExtractionResponse readStoredExtraction(String json) {
        if (json == null || json.isBlank()) {
            return new InventoryExtractionResponse(null, List.of());
        }
        try {
            return objectMapper.readValue(json, InventoryExtractionResponse.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read stored inventory extraction.", e);
        }
    }

    public String normalizeName(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ENGLISH)
                .replaceAll("[^a-z0-9]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private double similarity(String left, String right) {
        if (left.equals(right)) {
            return 1.0;
        }
        Set<String> leftTokens = new HashSet<>(Arrays.asList(left.split(" ")));
        Set<String> rightTokens = new HashSet<>(Arrays.asList(right.split(" ")));
        Set<String> intersection = new HashSet<>(leftTokens);
        intersection.retainAll(rightTokens);
        Set<String> union = new HashSet<>(leftTokens);
        union.addAll(rightTokens);
        double tokenScore = union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
        double prefixScore = right.contains(left) || left.contains(right) ? 0.8 : 0.0;
        return Math.max(tokenScore, prefixScore);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateInventoryResolution(ProductResolutionRequest resolution) {
        String action = resolution.action() != null ? resolution.action().trim().toUpperCase(Locale.ROOT) : "";
        if (!Set.of("MATCH_EXISTING", "CREATE_NEW", "EXCLUDE").contains(action)) {
            throw new IllegalArgumentException("Choose whether to match, create, or exclude each product.");
        }
        if ("EXCLUDE".equals(action)) {
            return;
        }
        if (resolution.quantity() == null || resolution.quantity() < 1) {
            throw new IllegalArgumentException("Product quantity must be a whole number of at least 1.");
        }
        if (resolution.rate() == null || resolution.rate().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Product unit cost must be greater than 0.");
        }
        if ("CREATE_NEW".equals(action) && blankToNull(resolution.productName()) == null) {
            throw new IllegalArgumentException("A product name is required when creating a product.");
        }
        if ("MATCH_EXISTING".equals(action) && resolution.productId() == null) {
            throw new IllegalArgumentException("Choose an inventory product for every matched item.");
        }
    }

    private String buildInventoryArtifactSummary(InventoryExtractionResponse extraction) {
        if (extraction == null || extraction.products() == null || extraction.products().isEmpty()) {
            return "Image uploaded for inventory review.";
        }
        String supplier = extraction.supplierName() != null && !extraction.supplierName().isBlank()
                ? extraction.supplierName()
                : "Unknown supplier";
        return supplier + " bill with " + extraction.products().size() + " extracted item(s).";
    }
}
