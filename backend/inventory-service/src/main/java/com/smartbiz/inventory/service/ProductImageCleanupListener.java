package com.smartbiz.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ProductImageCleanupListener {
    private final ProductImageService productImageService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void deleteAfterCommit(ProductImageDeleteEvent event) {
        productImageService.deleteAsset(event.publicId());
    }
}
