package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.CreateSupplierRequest;
import com.smartbiz.inventory.dto.SupplierDTO;
import com.smartbiz.inventory.dto.SupplierProductDTO;
import com.smartbiz.inventory.dto.UpdateSupplierRequest;
import com.smartbiz.inventory.model.Supplier;
import com.smartbiz.inventory.repository.ProductRepository;
import com.smartbiz.inventory.repository.SupplierRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupplierService {
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    public List<SupplierDTO> getSuppliers(Long userId) {
        return supplierRepository.findAllByUserIdOrderByNameAsc(userId)
            .stream().map(SupplierDTO::from).toList();
    }

    @Transactional
    public SupplierDTO createSupplier(Long userId, CreateSupplierRequest request) {
        String name = request.name().trim();
        if (supplierRepository.findByUserIdAndNameIgnoreCase(userId, name).isPresent()) {
            throw new IllegalArgumentException("Supplier '" + name + "' already exists");
        }
        Supplier supplier = Supplier.builder()
            .userId(userId)
            .name(name)
            .phone(request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null)
            .email(request.email() != null && !request.email().isBlank() ? request.email().trim() : null)
            .balanceOwed(request.balanceOwed() != null ? request.balanceOwed() : BigDecimal.ZERO)
            .notes(request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null)
            .build();
        log.info("Created supplier '{}' for userId={}", name, userId);
        return SupplierDTO.from(supplierRepository.save(supplier));
    }

    @Transactional
    public void findOrCreate(Long userId, String supplierName) {
        String trimmed = supplierName.trim();
        if (trimmed.isEmpty()) return;
        supplierRepository.findByUserIdAndNameIgnoreCase(userId, trimmed)
            .orElseGet(() -> {
                Supplier s = Supplier.builder().userId(userId).name(trimmed).build();
                log.info("Auto-created supplier '{}' for userId={}", trimmed, userId);
                return supplierRepository.save(s);
            });
    }

    @Transactional
    public SupplierDTO updateSupplier(Long userId, Long id, UpdateSupplierRequest request) {
        Supplier supplier = supplierRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + id));

        if (request.phone() != null) supplier.setPhone(request.phone().isBlank() ? null : request.phone().trim());
        if (request.email() != null) supplier.setEmail(request.email().isBlank() ? null : request.email().trim());
        if (request.balanceOwed() != null) supplier.setBalanceOwed(request.balanceOwed());
        if (request.notes() != null) supplier.setNotes(request.notes().isBlank() ? null : request.notes().trim());

        return SupplierDTO.from(supplierRepository.save(supplier));
    }

    public List<SupplierProductDTO> getProductsBySupplier(Long userId, Long supplierId) {
        Supplier supplier = supplierRepository.findByIdAndUserId(supplierId, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + supplierId));
        return productRepository.findByUserIdAndSupplierIgnoreCase(userId, supplier.getName())
            .stream()
            .map(p -> new SupplierProductDTO(p.getId(), p.getName(), p.getSku(), p.getCategory(), p.getPrice(), p.getQuantity()))
            .toList();
    }
}
