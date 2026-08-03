package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.StockReservationRequest;
import com.smartbiz.inventory.dto.StockReservationResponse;
import com.smartbiz.inventory.exception.InsufficientStockException;
import com.smartbiz.inventory.model.*;
import com.smartbiz.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockReservationService {
    private final ProductRepository productRepository;
    private final StockHistoryRepository stockHistoryRepository;
    private final StockReservationRepository reservationRepository;
    private final StockReservationItemRepository itemRepository;

    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalServiceToken;

    @Transactional
    public StockReservationResponse reserve(String token, StockReservationRequest request) {
        authorize(token);
        Optional<StockReservation> existing = reservationRepository.findById(request.reservationId());
        if (existing.isPresent()) return response(existing.get());

        Map<Long, Integer> requested = request.items().stream().collect(Collectors.toMap(
            StockReservationRequest.Item::productId, StockReservationRequest.Item::quantity, Integer::sum, TreeMap::new
        ));
        List<Product> products = productRepository.findAllLockedByUserAndIds(request.userId(), new ArrayList<>(requested.keySet()));
        if (products.size() != requested.size()) throw new IllegalArgumentException("One or more products were not found");

        for (Product product : products) {
            int quantity = requested.get(product.getId());
            if (product.getQuantity() < quantity) throw new InsufficientStockException(product.getId(), product.getQuantity(), -quantity);
        }

        StockReservation reservation = StockReservation.builder()
            .id(request.reservationId()).userId(request.userId()).status("ACTIVE").expiresAt(request.expiresAt()).build();
        reservationRepository.save(reservation);
        for (Product product : products) {
            int quantity = requested.get(product.getId());
            product.setQuantity(product.getQuantity() - quantity);
            itemRepository.save(StockReservationItem.builder()
                .reservationId(reservation.getId()).productId(product.getId()).quantity(quantity).build());
            stockHistoryRepository.save(StockHistory.builder().productId(product.getId()).quantityChange(-quantity)
                .type("STOCK_RESERVED").reason("Payment reservation " + reservation.getId()).createdBy(request.userId()).build());
        }
        productRepository.saveAll(products);
        return response(reservation);
    }

    @Transactional
    public StockReservationResponse commit(String token, UUID id) {
        authorize(token);
        StockReservation reservation = get(id);
        if ("RELEASED".equals(reservation.getStatus())) throw new IllegalStateException("Released reservation cannot be committed");
        if ("ACTIVE".equals(reservation.getStatus())) {
            reservation.setStatus("COMMITTED");
            reservationRepository.save(reservation);
        }
        return response(reservation);
    }

    @Transactional
    public StockReservationResponse release(String token, UUID id) {
        authorize(token);
        StockReservation reservation = get(id);
        if ("COMMITTED".equals(reservation.getStatus())) throw new IllegalStateException("Committed reservation cannot be released");
        if ("RELEASED".equals(reservation.getStatus())) return response(reservation);

        List<StockReservationItem> items = itemRepository.findByReservationId(id);
        List<Long> ids = items.stream().map(StockReservationItem::getProductId).sorted().toList();
        Map<Long, Product> products = productRepository.findAllLockedByUserAndIds(reservation.getUserId(), ids).stream()
            .collect(Collectors.toMap(Product::getId, Function.identity()));
        for (StockReservationItem item : items) {
            Product product = products.get(item.getProductId());
            if (product == null) throw new IllegalStateException("Reserved product no longer exists");
            product.setQuantity(product.getQuantity() + item.getQuantity());
            stockHistoryRepository.save(StockHistory.builder().productId(product.getId()).quantityChange(item.getQuantity())
                .type("STOCK_RELEASED").reason("Released payment reservation " + id).createdBy(reservation.getUserId()).build());
        }
        productRepository.saveAll(products.values());
        reservation.setStatus("RELEASED");
        reservationRepository.save(reservation);
        return response(reservation);
    }

    private StockReservation get(UUID id) {
        return reservationRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Stock reservation was not found"));
    }

    private StockReservationResponse response(StockReservation value) {
        return new StockReservationResponse(value.getId(), value.getStatus(), value.getExpiresAt());
    }

    private void authorize(String token) {
        if (token == null || !MessageDigest.isEqual(internalServiceToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new SecurityException("Invalid internal service token");
        }
    }
}
