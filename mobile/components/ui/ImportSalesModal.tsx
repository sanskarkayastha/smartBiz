import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Colors } from '@/components/ui/colors';
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import {
  addImportArtifact,
  analyzeImportSession,
  commitImportSession,
  createImportSession,
  reconcileImportSession,
  type ImportSession,
  type ImportSalesReviewItem,
  type ProductResolution,
  type ProductSuggestion,
} from '@/services/ai';
import type { Product } from '@/services/inventory';

type Props = {
  visible: boolean;
  products: Product[];
  initialSales?: unknown;
  sessionId?: number | null;
  initialSession?: ImportSession | null;
  onClose: () => void;
  onImported: () => void;
  onSessionChange?: (session: ImportSession | null) => void;
};

function groupSaleItems(items: ImportSalesReviewItem[]) {
  const map = new Map<string, ImportSalesReviewItem>();
  for (const item of items) {
    if (!map.has(item.normalizedName)) {
      map.set(item.normalizedName, item);
    }
  }
  return Array.from(map.values());
}

function resolutionLabel(resolution: ProductResolution | undefined) {
  if (!resolution) return 'Needs review';
  if (resolution.action === 'MATCH_EXISTING') return `Match: ${resolution.productName ?? 'Inventory product'}`;
  if (resolution.action === 'CREATE_NEW') return `Create: ${resolution.productName ?? resolution.sourceName}`;
  return 'Excluded';
}

export default function ImportSalesModal({
  visible,
  sessionId,
  initialSession,
  onClose,
  onImported,
  onSessionChange,
}: Props) {
  const [session, setSession] = useState<ImportSession | null>(initialSession ?? null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSession(initialSession ?? null);
    setError('');
  }, [initialSession, visible]);

  const review = session?.review ?? null;
  const uniqueItems = useMemo(
    () => (review ? groupSaleItems(review.candidateSaleItems) : []),
    [review],
  );

  const persistSession = (next: ImportSession) => {
    setSession(next);
    onSessionChange?.(next);
  };

  const ensureSession = async () => {
    if (session?.id) return session;
    const created = await createImportSession('SALES', 'Historical sales import', false);
    persistSession(created);
    return created;
  };

  const handleClose = () => {
    setLoading(false);
    setImporting(false);
    setError('');
    onClose();
  };

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
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const workbook = XLSX.read(base64, { type: 'base64' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const fileText = XLSX.utils.sheet_to_csv(worksheet);
      const active = await ensureSession();
      const artifactSession = await addImportArtifact(active.id, {
        kind: 'SHEET',
        label: asset.name ?? 'sales-sheet.xlsx',
        fileText,
        sourceIntent: 'HISTORICAL_SALES',
      });
      persistSession(artifactSession);
      const artifactId = artifactSession.artifacts.at(-1)?.id;
      const analyzed = await analyzeImportSession(active.id, artifactId);
      persistSession(analyzed);
      if (!analyzed.review?.candidateSales?.length) {
        setError('No historical sales could be extracted from this sheet.');
      }
    } catch {
      setError('Could not read this Excel sheet. Please try a different file.');
    } finally {
      setLoading(false);
    }
  };

  const updateResolution = async (normalizedName: string, patch: Partial<ProductResolution>) => {
    if (!session?.id || !review) return;
    setLoading(true);
    setError('');
    try {
      const current = review.resolutions[normalizedName];
      const next = await reconcileImportSession(session.id, {
        supplierName: review.supplierName,
        resolutions: [{ ...current, ...patch }],
      });
      persistSession(next);
    } catch {
      setError('Could not update that product match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!session?.id) return;
    setImporting(true);
    setError('');
    try {
      const result = await commitImportSession(session.id, review?.supplierName ?? null);
      onSessionChange?.({
        ...(session as ImportSession),
        status: 'COMPLETED',
        summary: result.message,
        closedAt: new Date().toISOString(),
      });
      handleClose();
      onImported();
    } catch {
      setError('Sales import failed. Please review the product resolutions and try again.');
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
              Upload an old sales sheet, review SmartBiz&apos;s matches, then import the history
              without changing live stock.
            </Text>
          </View>
          <ModalCloseButton onPress={handleClose} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!review ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cloud-upload-outline" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Select a sales sheet</Text>
              <Text style={styles.emptyText}>
                SmartBiz will extract historical sales, remember this sheet in the current import
                session, and let you resolve product matches before saving.
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
            <View style={styles.content}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Current Import Session</Text>
                <Text style={styles.summaryText}>{session?.summary}</Text>
              </View>

              {!!review.warnings.length && (
                <View style={styles.warningCard}>
                  {review.warnings.map((warning) => (
                    <Text key={warning} style={styles.warningText}>
                      {warning}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resolve Product Matches</Text>
                <Text style={styles.sectionSub}>
                  Each decision is applied to repeated names across this sheet.
                </Text>
                {uniqueItems.map((item) => {
                  const resolution = review.resolutions[item.normalizedName];
                  const suggestions = review.matchSuggestions[item.normalizedName] ?? [];
                  return (
                    <View key={item.normalizedName} style={styles.matchCard}>
                      <Text style={styles.matchName}>{item.productName}</Text>
                      <Text style={styles.matchMeta}>
                        Current choice: {resolutionLabel(resolution)}
                      </Text>
                      <View style={styles.chipWrap}>
                        {suggestions.map((suggestion: ProductSuggestion) => (
                          <Pressable
                            key={suggestion.productId}
                            style={[
                              styles.choiceChip,
                              resolution?.action === 'MATCH_EXISTING' &&
                                resolution.productId === suggestion.productId &&
                                styles.choiceChipActive,
                            ]}
                            onPress={() =>
                              updateResolution(item.normalizedName, {
                                action: 'MATCH_EXISTING',
                                productId: suggestion.productId,
                                productName: suggestion.productName,
                                category: suggestion.category,
                                supplier: suggestion.supplier,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.choiceChipText,
                                resolution?.action === 'MATCH_EXISTING' &&
                                  resolution.productId === suggestion.productId &&
                                  styles.choiceChipTextActive,
                              ]}
                            >
                              {suggestion.productName}
                            </Text>
                          </Pressable>
                        ))}
                        <Pressable
                          style={[
                            styles.choiceChip,
                            resolution?.action === 'CREATE_NEW' && styles.choiceChipActive,
                          ]}
                          onPress={() =>
                            updateResolution(item.normalizedName, {
                              action: 'CREATE_NEW',
                              productId: null,
                              productName: item.productName,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              resolution?.action === 'CREATE_NEW' && styles.choiceChipTextActive,
                            ]}
                          >
                            Create new
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.choiceChip,
                            resolution?.action === 'EXCLUDE' && styles.choiceChipDanger,
                          ]}
                          onPress={() =>
                            updateResolution(item.normalizedName, {
                              action: 'EXCLUDE',
                              productId: null,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              resolution?.action === 'EXCLUDE' && styles.choiceChipDangerText,
                            ]}
                          >
                            Exclude
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Extracted Sales</Text>
                <Text style={styles.sectionSub}>
                  These will be saved as imported analytics history after the product matches are
                  confirmed.
                </Text>
                {review.candidateSales.map((sale, saleIndex) => (
                  <View key={`${sale.saleDate}-${saleIndex}`} style={styles.saleCard}>
                    <Text style={styles.saleTitle}>Sale #{saleIndex + 1}</Text>
                    <Text style={styles.saleMeta}>
                      {sale.saleDate} • {sale.paymentMethod} • {sale.customerName ?? 'Walk-in customer'}
                    </Text>
                    {sale.items.map((item, itemIndex) => (
                      <View key={`${item.productName}-${itemIndex}`} style={styles.saleItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.saleItemName}>{item.productName}</Text>
                          <Text style={styles.saleItemMeta}>
                            Qty {item.quantity} • NPR {item.unitPrice}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
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
              (!review || loading || importing) && styles.primaryBtnDisabled,
            ]}
            onPress={handleImport}
            disabled={!review || loading || importing}
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
  content: { gap: 16 },
  summaryCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  summaryText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  warningCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
    gap: 6,
  },
  warningText: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  sectionSub: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  matchCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  matchName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  matchMeta: { fontSize: 12, color: Colors.textMuted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  choiceChipDanger: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.danger,
  },
  choiceChipText: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  choiceChipTextActive: { color: Colors.textOnPrimary },
  choiceChipDangerText: { color: Colors.danger },
  saleCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  saleTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  saleMeta: { fontSize: 12, color: Colors.textMuted },
  saleItemRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saleItemName: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  saleItemMeta: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
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
