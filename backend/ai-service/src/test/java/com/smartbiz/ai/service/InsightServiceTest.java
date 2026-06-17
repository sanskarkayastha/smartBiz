package com.smartbiz.ai.service;

import com.smartbiz.ai.dto.InsightCard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class InsightServiceTest {

    private RemoteBusinessClient remoteBusinessClient;
    private InsightService insightService;

    @BeforeEach
    void setUp() {
        remoteBusinessClient = Mockito.mock(RemoteBusinessClient.class);
        insightService = new InsightService(remoteBusinessClient);
    }

    @Test
    void buildInsightCards_returnsRestockSlowStockBundleAndCashFlowSignals() {
        LocalDateTime now = LocalDateTime.now();
        when(remoteBusinessClient.getInventoryProducts(1L)).thenReturn(List.of(
                new RemoteBusinessClient.InventoryProduct(1L, 1L, "Coke 500ml", null, "Beverages", BigDecimal.valueOf(120), BigDecimal.valueOf(90), 5, 4, "Supplier A", null, null, true),
                new RemoteBusinessClient.InventoryProduct(2L, 1L, "Digestive Biscuits", null, "Snacks", BigDecimal.valueOf(50), BigDecimal.valueOf(35), 40, 5, "Supplier B", null, null, false),
                new RemoteBusinessClient.InventoryProduct(3L, 1L, "Wai Wai", null, "Noodles", BigDecimal.valueOf(25), BigDecimal.valueOf(18), 25, 5, "Supplier A", null, null, false)
        ));
        when(remoteBusinessClient.getSales(1L)).thenReturn(List.of(
                new RemoteBusinessClient.SaleRecord(10L, null, null, BigDecimal.valueOf(240), "CASH", "COMPLETED", now.minusDays(1),
                        List.of(
                                new RemoteBusinessClient.SaleItemRecord(1L, "Coke 500ml", 2, BigDecimal.valueOf(120), BigDecimal.valueOf(240)),
                                new RemoteBusinessClient.SaleItemRecord(3L, "Wai Wai", 2, BigDecimal.valueOf(25), BigDecimal.valueOf(50))
                        )),
                new RemoteBusinessClient.SaleRecord(11L, null, null, BigDecimal.valueOf(145), "DUE", "COMPLETED", now.minusDays(2),
                        List.of(
                                new RemoteBusinessClient.SaleItemRecord(1L, "Coke 500ml", 3, BigDecimal.valueOf(120), BigDecimal.valueOf(360)),
                                new RemoteBusinessClient.SaleItemRecord(3L, "Wai Wai", 3, BigDecimal.valueOf(25), BigDecimal.valueOf(75))
                        )),
                new RemoteBusinessClient.SaleRecord(12L, null, null, BigDecimal.valueOf(145), "CASH", "COMPLETED", now.minusDays(3),
                        List.of(
                                new RemoteBusinessClient.SaleItemRecord(1L, "Coke 500ml", 3, BigDecimal.valueOf(120), BigDecimal.valueOf(360)),
                                new RemoteBusinessClient.SaleItemRecord(3L, "Wai Wai", 3, BigDecimal.valueOf(25), BigDecimal.valueOf(75))
                        ))
        ));
        when(remoteBusinessClient.getCustomersWithDue(1L)).thenReturn(List.of(
                new RemoteBusinessClient.CustomerRecord(5L, "Asha", null, null, BigDecimal.valueOf(1000), BigDecimal.valueOf(500), now.minusDays(2))
        ));

        List<InsightCard> cards = insightService.buildInsightCards(1L);

        assertThat(cards).extracting(InsightCard::type).contains(
                "RESTOCK_SOON",
                "SLOW_MOVING_STOCK",
                "BUNDLE_OPPORTUNITY",
                "CASH_FLOW_WARNING"
        );
    }
}
