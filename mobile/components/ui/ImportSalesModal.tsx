import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Colors } from '@/components/ui/colors';
import { parseSalesFile, type ParsedSale, type ParsedSaleItem } from '@/services/ai';
import { salesService, type CreateSalePayload } from '@/services/sales';
import type { Product } from '@/services/inventory';

type Props = {
  visible: boolean;
  products: Product[];
  initialSales?: ParsedSale[] | null;
  onClose: () => void;
  onImported: () => void;
};

type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'DUE';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'DIGITAL', 'DUE'];

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function lookupKeys(value: string) {
  const normalized = normalizeName(value);
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return compact && compact !== normalized ? [normalized, compact] : [normalized];
}

function formatAmount(quantity: number, unitPrice: number) {
  return `NPR ${(quantity * unitPrice).toLocaleString()}`;
}

export default function ImportSalesModal({
  visible,
  products,
  initialSales,
  onClose,
  onImported,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [sales, setSales] = useState<ParsedSale[] | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      for (const key of lookupKeys(product.name)) {
        map.set(key, product);
      }
    }
    return map;
  }, [products]);

  const handleClose = () => {
    setError('');
    setLoading(false);
    setImporting(false);
    setSales(null);
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    setError('');
    setSales(initialSales ?? null);
  }, [initialSales, visible]);

  const pickExcel = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
      const workbook = XLSX.read(base64, { type: 'base64' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const fileText = XLSX.utils.sheet_to_csv(worksheet);
      const parsedSales = await parseSalesFile(fileText);

      if (!parsedSales.length) {
        setError('No sales could be extracted from this file.');
        return;
      }

      setSales(parsedSales);
    } catch {
      setError('Could not read this Excel sheet. Please try a different file.');
    } finally {
      setLoading(false);
    }
  };

  const updateSaleField = (index: number, field: keyof ParsedSale, value: string) => {
    setSales((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateItemField = (
    saleIndex: number,
    itemIndex: number,
    field: keyof ParsedSaleItem,
    value: string,
  ) => {
    setSales((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const sale = next[saleIndex];
      const items = [...sale.items];
      items[itemIndex] = {
        ...items[itemIndex],
        [field]: field === 'productName' ? value : Number(value),
      };
      next[saleIndex] = { ...sale, items };
      return next;
    });
  };

  const removeSale = (index: number) => {
    setSales((prev) => {
      if (!prev) return prev;
      const next = prev.filter((_, saleIndex) => saleIndex !== index);
      return next.length ? next : null;
    });
  };

  const handleImport = async () => {
    if (!sales?.length) return;

    setImporting(true);
    setError('');

    try {
      const missingProducts = new Set<string>();
      const payloadSales: CreateSalePayload[] = [];

      for (const sale of sales) {
        if (!sale.saleDate?.trim()) {
          throw new Error('Every imported sale needs a date before you can save.');
        }

        const items = sale.items
          .map((item) => {
            const matched = lookupKeys(item.productName)
              .map((key) => productMap.get(key))
              .find(Boolean);
            if (!matched) {
              missingProducts.add(item.productName);
              return null;
            }

            const quantity = Math.round(Number(item.quantity));
            const unitPrice = Number(item.unitPrice);

            if (!Number.isFinite(quantity) || quantity <= 0) {
              throw new Error(`"${item.productName}" needs a quantity greater than 0.`);
            }

            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
              throw new Error(`"${item.productName}" needs a valid unit price.`);
            }

            return {
              productId: matched.id,
              quantity,
              unitPrice,
            };
          })
          .filter(Boolean) as CreateSalePayload['items'];

        if (items.length === 0) {
          throw new Error('Each imported sale needs at least one valid item.');
        }

        payloadSales.push({
          customerName: sale.customerName?.trim() || null,
          paymentMethod: sale.paymentMethod || 'CASH',
          saleDate: `${sale.saleDate}T12:00:00`,
          items,
        });
      }

      if (missingProducts.size > 0) {
        throw new Error(
          `These product names do not match inventory yet: ${Array.from(missingProducts).join(', ')}`,
        );
      }

      await salesService.importSales({ sales: payloadSales });
      handleClose();
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sales import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Sales Import</Text>
            <Text style={styles.subtitle}>
              Upload an Excel sheet, review the detected historical sales, then save them as
              analytics records without changing inventory.
            </Text>
          </View>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.textDark} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!sales ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cloud-upload-outline" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Select a sales sheet</Text>
              <Text style={styles.emptyText}>
                Best results come from columns like sale date, customer, payment method, product
                name, quantity, and unit price.
              </Text>
              <Pressable
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={pickExcel}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="document-outline" size={18} color={Colors.textOnPrimary} />
                    <Text style={styles.primaryBtnText}>Choose Excel Sheet</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.salesList}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{sales.length} sales ready for review</Text>
                <Pressable onPress={pickExcel} disabled={loading} style={styles.secondaryChip}>
                  <Ionicons name="refresh" size={14} color={Colors.primary} />
                  <Text style={styles.secondaryChipText}>Replace sheet</Text>
                </Pressable>
              </View>

              {sales.map((sale, saleIndex) => (
                <View key={saleIndex} style={styles.saleCard}>
                  <View style={styles.saleTopRow}>
                    <Text style={styles.saleTitle}>Sale #{saleIndex + 1}</Text>
                    <Pressable onPress={() => removeSale(saleIndex)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </Pressable>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Date</Text>
                    <TextInput
                      style={styles.input}
                      value={sale.saleDate}
                      onChangeText={(value) => updateSaleField(saleIndex, 'saleDate', value)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Customer</Text>
                    <TextInput
                      style={styles.input}
                      value={sale.customerName ?? ''}
                      onChangeText={(value) => updateSaleField(saleIndex, 'customerName', value)}
                      placeholder="Walk-in customer"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>Payment</Text>
                  <View style={styles.paymentRow}>
                    {PAYMENT_METHODS.map((method) => (
                      <Pressable
                        key={method}
                        onPress={() => updateSaleField(saleIndex, 'paymentMethod', method)}
                        style={[
                          styles.paymentBtn,
                          sale.paymentMethod === method && styles.paymentBtnActive,
                          method === 'DUE' && styles.paymentBtnDue,
                          method === 'DUE' &&
                            sale.paymentMethod === method &&
                            styles.paymentBtnDueActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentBtnText,
                            sale.paymentMethod === method && styles.paymentBtnTextActive,
                          ]}
                        >
                          {method}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.itemsSection}>
                    {sale.items.map((item, itemIndex) => {
                      const matched = lookupKeys(item.productName)
                        .map((key) => productMap.get(key))
                        .find(Boolean);
                      const quantity = Number(item.quantity) || 0;
                      const unitPrice = Number(item.unitPrice) || 0;

                      return (
                        <View key={itemIndex} style={styles.itemCard}>
                          <Text style={styles.fieldLabel}>Product</Text>
                          <TextInput
                            style={styles.input}
                            value={item.productName}
                            onChangeText={(value) =>
                              updateItemField(saleIndex, itemIndex, 'productName', value)
                            }
                            placeholder="Product name"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.matchText,
                              matched ? styles.matchTextSuccess : styles.matchTextError,
                            ]}
                          >
                            {matched
                              ? `Matched to inventory: ${matched.name}`
                              : 'No inventory match yet'}
                          </Text>

                          <View style={styles.itemRow}>
                            <View style={styles.itemField}>
                              <Text style={styles.fieldLabel}>Qty</Text>
                              <TextInput
                                style={styles.input}
                                value={String(item.quantity)}
                                onChangeText={(value) =>
                                  updateItemField(saleIndex, itemIndex, 'quantity', value)
                                }
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                            <View style={styles.itemField}>
                              <Text style={styles.fieldLabel}>Unit price</Text>
                              <TextInput
                                style={styles.input}
                                value={String(item.unitPrice)}
                                onChangeText={(value) =>
                                  updateItemField(saleIndex, itemIndex, 'unitPrice', value)
                                }
                                keyboardType="decimal-pad"
                                placeholder="0"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                          </View>

                          <Text style={styles.itemTotal}>
                            {formatAmount(quantity, unitPrice)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.footerSecondaryBtn} onPress={handleClose}>
            <Text style={styles.footerSecondaryBtnText}>Close</Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryBtn,
              (!sales?.length || loading || importing) && styles.primaryBtnDisabled,
            ]}
            onPress={handleImport}
            disabled={!sales?.length || loading || importing}
          >
            {importing ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="cloud-done-outline" size={18} color={Colors.textOnPrimary} />
                <Text style={styles.primaryBtnText}>Import Sales</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textDark },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: Colors.textMuted },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    padding: 20,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: '700', color: Colors.textDark },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  salesList: { gap: 14 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textDark },
  secondaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  secondaryChipText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  saleCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  saleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textDark,
  },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  paymentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentBtnDue: { borderColor: Colors.danger },
  paymentBtnDueActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  paymentBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  paymentBtnTextActive: { color: Colors.textOnPrimary },
  itemsSection: { gap: 10 },
  itemCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  matchText: { fontSize: 12, fontWeight: '500' },
  matchTextSuccess: { color: Colors.success },
  matchTextError: { color: Colors.danger },
  itemRow: { flexDirection: 'row', gap: 10 },
  itemField: { flex: 1, gap: 6 },
  itemTotal: { fontSize: 12, fontWeight: '700', color: Colors.textDark, textAlign: 'right' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerSecondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingVertical: 14,
  },
  footerSecondaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },
  error: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    color: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '500',
  },
});
