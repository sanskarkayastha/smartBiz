package com.smartbiz.ai.service;

import com.smartbiz.ai.dto.InsightCard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InsightService {

    private final RemoteBusinessClient remoteBusinessClient;

    public List<InsightCard> buildInsightCards(Long userId) {
        List<RemoteBusinessClient.InventoryProduct> products = remoteBusinessClient.getInventoryProducts(userId);
        List<RemoteBusinessClient.SaleRecord> sales = remoteBusinessClient.getSales(userId);
        List<RemoteBusinessClient.CustomerRecord> dueCustomers = remoteBusinessClient.getCustomersWithDue(userId);

        List<InsightCard> cards = new ArrayList<>();
        restockInsight(products, sales).ifPresent(cards::add);
        slowMovingInsight(products, sales).ifPresent(cards::add);
        bundleInsight(sales).ifPresent(cards::add);
        cashFlowInsight(sales, dueCustomers).ifPresent(cards::add);
        return cards;
    }

    public String summarizeInsights(Long userId) {
        List<InsightCard> cards = buildInsightCards(userId);
        if (cards.isEmpty()) {
            return "Your business looks stable right now. Add more sales history to unlock richer strategic insights.";
        }
        return cards.stream()
                .limit(3)
                .map(card -> "- " + card.message())
                .collect(Collectors.joining("\n"));
    }

    private Optional<InsightCard> restockInsight(
            List<RemoteBusinessClient.InventoryProduct> products,
            List<RemoteBusinessClient.SaleRecord> sales
    ) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        Map<Long, Integer> unitsSold = new HashMap<>();
        sales.stream()
                .filter(sale -> sale.saleDate() != null && !sale.saleDate().isBefore(cutoff))
                .flatMap(sale -> sale.items().stream())
                .forEach(item -> unitsSold.merge(item.productId(), item.quantity(), Integer::sum));

        return products.stream()
                .filter(product -> product.id() != null && product.quantity() != null && product.quantity() > 0)
                .map(product -> {
                    int sold = unitsSold.getOrDefault(product.id(), 0);
                    double dailyVelocity = sold / 14.0;
                    double daysCover = dailyVelocity > 0 ? product.quantity() / dailyVelocity : Double.MAX_VALUE;
                    return new RestockCandidate(product, sold, daysCover);
                })
                .filter(candidate -> candidate.sold() >= 4 && candidate.daysCover() <= 7.0)
                .min(Comparator.comparingDouble(RestockCandidate::daysCover))
                .map(candidate -> new InsightCard(
                        "RESTOCK_SOON",
                        "Restock Soon",
                        "%s may run out in about %s days. You sold %d units in the last 14 days and only %d remain."
                                .formatted(
                                        candidate.product().name(),
                                        formatDecimal(candidate.daysCover()),
                                        candidate.sold(),
                                        candidate.product().quantity()
                                ),
                        "confident"
                ));
    }

    private Optional<InsightCard> slowMovingInsight(
            List<RemoteBusinessClient.InventoryProduct> products,
            List<RemoteBusinessClient.SaleRecord> sales
    ) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(21);
        Map<Long, Integer> unitsSold = new HashMap<>();
        sales.stream()
                .filter(sale -> sale.saleDate() != null && !sale.saleDate().isBefore(cutoff))
                .flatMap(sale -> sale.items().stream())
                .forEach(item -> unitsSold.merge(item.productId(), item.quantity(), Integer::sum));

        return products.stream()
                .filter(product -> product.id() != null && product.quantity() != null && product.quantity() >= 10)
                .map(product -> new SlowStockCandidate(product, unitsSold.getOrDefault(product.id(), 0)))
                .filter(candidate -> candidate.sold() <= 2)
                .max(Comparator.comparingInt(candidate -> candidate.product().quantity()))
                .map(candidate -> new InsightCard(
                        "SLOW_MOVING_STOCK",
                        "Slow-Moving Stock",
                        "%s is moving slowly. You still have %d units, but only %d sold in the last 21 days."
                                .formatted(candidate.product().name(), candidate.product().quantity(), candidate.sold()),
                        "suggestive"
                ));
    }

    private Optional<InsightCard> bundleInsight(List<RemoteBusinessClient.SaleRecord> sales) {
        Map<String, Integer> pairCounts = new HashMap<>();
        for (RemoteBusinessClient.SaleRecord sale : sales) {
            if (sale.items() == null || sale.items().size() < 2) {
                continue;
            }
            List<String> names = sale.items().stream()
                    .map(RemoteBusinessClient.SaleItemRecord::productName)
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(name -> !name.isBlank())
                    .distinct()
                    .sorted()
                    .toList();
            for (int i = 0; i < names.size(); i++) {
                for (int j = i + 1; j < names.size(); j++) {
                    pairCounts.merge(names.get(i) + "||" + names.get(j), 1, Integer::sum);
                }
            }
        }
        return pairCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .filter(entry -> entry.getValue() >= 3)
                .map(entry -> {
                    String[] parts = entry.getKey().split("\\|\\|");
                    return new InsightCard(
                            "BUNDLE_OPPORTUNITY",
                            "Bundle Opportunity",
                            "%s and %s are frequently bought together. Keeping both stocked together may lift basket size."
                                    .formatted(parts[0], parts[1]),
                            "suggestive"
                    );
                });
    }

    private Optional<InsightCard> cashFlowInsight(
            List<RemoteBusinessClient.SaleRecord> sales,
            List<RemoteBusinessClient.CustomerRecord> dueCustomers
    ) {
        LocalDateTime now = LocalDateTime.now();
        BigDecimal dueThisWeek = sumDueSales(sales, now.minusDays(7), now);
        BigDecimal dueLastWeek = sumDueSales(sales, now.minusDays(14), now.minusDays(7));
        BigDecimal outstanding = dueCustomers.stream()
                .map(customer -> customer.dueAmount() != null ? customer.dueAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (dueThisWeek.compareTo(BigDecimal.ZERO) <= 0 && outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            return Optional.empty();
        }

        String message;
        if (dueThisWeek.compareTo(dueLastWeek) > 0 && dueThisWeek.compareTo(BigDecimal.ZERO) > 0) {
            message = "Credit sales are rising. Due sales reached NPR %s this week, and total outstanding customer balance is NPR %s."
                    .formatted(formatMoney(dueThisWeek), formatMoney(outstanding));
        } else {
            message = "Customers currently owe NPR %s. Keep an eye on repeat credit sales so cash does not stay locked too long."
                    .formatted(formatMoney(outstanding));
        }

        return Optional.of(new InsightCard(
                "CASH_FLOW_WARNING",
                "Cash Flow Warning",
                message,
                "confident"
        ));
    }

    private BigDecimal sumDueSales(List<RemoteBusinessClient.SaleRecord> sales, LocalDateTime from, LocalDateTime to) {
        return sales.stream()
                .filter(sale -> sale.saleDate() != null
                        && !sale.saleDate().isBefore(from)
                        && sale.saleDate().isBefore(to)
                        && "DUE".equalsIgnoreCase(sale.paymentMethod()))
                .map(sale -> sale.totalAmount() != null ? sale.totalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String formatDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private String formatMoney(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private record RestockCandidate(RemoteBusinessClient.InventoryProduct product, int sold, double daysCover) {}

    private record SlowStockCandidate(RemoteBusinessClient.InventoryProduct product, int sold) {}
}
