package com.smartbiz.inventory.repository;

import com.smartbiz.inventory.model.SupplierLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierLedgerEntryRepository extends JpaRepository<SupplierLedgerEntry, Long> {
    List<SupplierLedgerEntry> findTop20BySupplierIdAndUserIdOrderByCreatedAtDescIdDesc(Long supplierId, Long userId);
}
