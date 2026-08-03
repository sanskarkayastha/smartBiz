import {
  ActivityIndicator,
  Alert,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from './colors';
import CategoryPicker from './CategoryPicker';
import ModalCloseButton from './ModalCloseButton';
import { inventoryService, type Category } from '@/services/inventory';
import { supplierService } from '@/services/suppliers';
import {
  addImportArtifact,
  analyzeImportSession,
  commitImportSession,
  createImportSession,
  reconcileImportSession,
  type ImportReviewItem,
  type ImportSession,
  type ProductResolution,
  type ProductSuggestion,
} from '@/services/ai';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialProducts?: unknown;
  sessionId?: number | null;
  initialSession?: ImportSession | null;
  onSessionChange?: (session: ImportSession | null) => void;
};

type ProductDraft = Omit<ProductResolution, 'quantity' | 'rate'> & {
  quantity: string;
  rate: string;
};

function groupItems(items: ImportReviewItem[]) {
  const map = new Map<string, ImportReviewItem>();
  for (const item of items) {
    const existing = map.get(item.normalizedName);
    map.set(item.normalizedName, existing
      ? { ...existing, quantity: existing.quantity + item.quantity }
      : item);
  }
  return Array.from(map.values());
}

function resolutionLabel(resolution: ProductDraft | undefined) {
  if (!resolution) return 'Needs review';
  if (resolution.action === 'MATCH_EXISTING') return `Matches ${resolution.productName ?? 'inventory product'}`;
  if (resolution.action === 'CREATE_NEW') return 'New product';
  return 'Excluded';
}

function createDrafts(items: ImportReviewItem[], resolutions: Record<string, ProductResolution>) {
  const drafts: Record<string, ProductDraft> = {};
  for (const item of groupItems(items)) {
    const resolution = resolutions[item.normalizedName];
    drafts[item.normalizedName] = {
      normalizedName: item.normalizedName,
      sourceName: resolution?.sourceName ?? item.sourceName,
      action: resolution?.action ?? (item.matchedProductId ? 'MATCH_EXISTING' : 'CREATE_NEW'),
      productId: resolution?.productId ?? item.matchedProductId,
      productName: resolution?.productName ?? item.matchedProductName ?? item.sourceName,
      category: resolution?.category ?? item.category,
      supplier: resolution?.supplier ?? item.supplier,
      quantity: String(resolution?.quantity ?? Math.round(item.quantity)),
      rate: String(resolution?.rate ?? item.rate),
      createCategory: resolution?.createCategory ?? true,
      createSupplier: resolution?.createSupplier ?? true,
    };
  }
  return drafts;
}

export default function InvoiceScanModal({
  visible,
  onClose,
  onSaved,
  initialSession,
  onSessionChange,
}: Props) {
  const [session, setSession] = useState<ImportSession | null>(initialSession ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierName, setSupplierName] = useState(initialSession?.review?.supplierName ?? '');
  const [supplierSuggestions, setSupplierSuggestions] = useState<string[]>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const supplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const review = session?.review ?? null;
  const uniqueItems = useMemo(() => (review ? groupItems(review.candidateProducts) : []), [review]);
  const includedCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.action !== 'EXCLUDE').length,
    [drafts],
  );

  useEffect(() => {
    if (!visible) return;
    setSession(initialSession ?? null);
    setSupplierName(initialSession?.review?.supplierName ?? '');
    setError('');
    setFieldErrors({});
    void inventoryService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, [initialSession, visible]);

  useEffect(() => {
    if (!review) {
      setDrafts({});
      setExpandedItem(null);
      return;
    }
    setDrafts(createDrafts(review.candidateProducts, review.resolutions));
    setExpandedItem((current) => current ?? review.candidateProducts[0]?.normalizedName ?? null);
  }, [review]);

  useEffect(() => {
    if (supplierTimerRef.current) clearTimeout(supplierTimerRef.current);
    const query = supplierName.trim();
    if (!visible || !query) {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
      return;
    }

    supplierTimerRef.current = setTimeout(async () => {
      try {
        const result = await supplierService.getSuppliers(0, 5, { search: query });
        const exact = result.content.find((supplier) => supplier.name.trim().toLowerCase() === query.toLowerCase());
        if (exact && exact.name !== supplierName) setSupplierName(exact.name);
        setSupplierSuggestions(result.content.map((supplier) => supplier.name));
        setShowSupplierSuggestions(result.content.length > 0);
      } catch {
        setSupplierSuggestions([]);
        setShowSupplierSuggestions(false);
      }
    }, 250);

    return () => {
      if (supplierTimerRef.current) clearTimeout(supplierTimerRef.current);
    };
  }, [supplierName, visible]);

  const persistSession = (next: ImportSession) => {
    setSession(next);
    setSupplierName((current) => next.review?.supplierName ?? current);
    onSessionChange?.(next);
  };

  const ensureSession = async () => {
    if (session?.id) return session;
    const created = await createImportSession('INVENTORY', 'Inventory import', false);
    persistSession(created);
    return created;
  };

  const handleClose = () => {
    setLoading(false);
    setSaving(false);
    setError('');
    setShowSupplierSuggestions(false);
    onClose();
  };

  const processAsset = async (label: string, image?: string, mimeType?: string) => {
    if (!image) return;
    setLoading(true);
    setError('');
    try {
      const active = await ensureSession();
      const artifactSession = await addImportArtifact(active.id, {
        kind: 'IMAGE',
        label,
        image,
        mimeType,
        sourceIntent: 'PURCHASE_BILL',
      });
      persistSession(artifactSession);
      const artifactId = artifactSession.artifacts.at(-1)?.id;
      const analyzed = await analyzeImportSession(active.id, artifactId);
      persistSession(analyzed);
      if (!analyzed.review?.candidateProducts?.length) {
        setError('No inventory items could be extracted from this bill.');
      }
    } catch {
      setError('Could not scan this bill. Please try another photo.');
    } finally {
      setLoading(false);
    }
  };

  const pickFromCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Camera permission is needed to scan invoices.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await processAsset('Camera bill', asset.base64 ?? undefined, asset.mimeType ?? 'image/jpeg');
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.7,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await processAsset(asset.fileName ?? 'Gallery bill', asset.base64 ?? undefined, asset.mimeType ?? 'image/jpeg');
    }
  };

  const updateDraft = (normalizedName: string, patch: Partial<ProductDraft>) => {
    setDrafts((current) => ({
      ...current,
      [normalizedName]: { ...current[normalizedName], ...patch },
    }));
    setFieldErrors((current) => {
      if (!current[normalizedName]) return current;
      const next = { ...current };
      delete next[normalizedName];
      return next;
    });
  };

  const handleCreateCategory = async (name: string) => {
    try {
      const created = await inventoryService.createCategory(name);
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    } catch (createError) {
      const refreshed = await inventoryService.getCategories().catch(() => null);
      const existing = refreshed?.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (refreshed) setCategories(refreshed);
      if (existing) return existing;
      throw createError;
    }
  };

  const validateDraft = (draft: ProductDraft) => {
    if (draft.action === 'EXCLUDE') return [];
    const errors: string[] = [];
    const quantity = Number(draft.quantity);
    const rate = Number(draft.rate);
    if (draft.action === 'CREATE_NEW' && !draft.productName?.trim()) errors.push('Enter a product name.');
    if (!Number.isInteger(quantity) || quantity < 1) errors.push('Quantity must be a whole number of at least 1.');
    if (!Number.isFinite(rate) || rate <= 0) errors.push('Unit cost must be greater than 0.');
    return errors;
  };

  const handleSave = async () => {
    if (!session?.id || !review) return;

    const nextErrors: Record<string, string[]> = {};
    for (const item of uniqueItems) {
      const draft = drafts[item.normalizedName];
      if (!draft) continue;
      const errors = validateDraft(draft);
      if (errors.length) nextErrors[item.normalizedName] = errors;
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setExpandedItem(Object.keys(nextErrors)[0]);
      setError('Correct the highlighted product details before saving.');
      return;
    }
    if (includedCount === 0) {
      setError('Include at least one product before saving.');
      return;
    }

    const trimmedSupplier = supplierName.trim();
    const resolutions: ProductResolution[] = uniqueItems.map((item) => {
      const draft = drafts[item.normalizedName];
      const category = draft.category?.trim() || null;
      const categoryExists = !!category && categories.some(
        (itemCategory) => itemCategory.name.trim().toLowerCase() === category.toLowerCase(),
      );
      return {
        ...draft,
        productName: draft.action === 'CREATE_NEW' ? draft.productName?.trim() || null : draft.productName,
        category,
        supplier: trimmedSupplier || null,
        quantity: draft.action === 'EXCLUDE' ? null : Number(draft.quantity),
        rate: draft.action === 'EXCLUDE' ? null : Number(draft.rate),
        createCategory: !!category && !categoryExists,
        createSupplier: !!trimmedSupplier,
      };
    });

    setSaving(true);
    setError('');
    try {
      const reconciled = await reconcileImportSession(session.id, {
        supplierName: trimmedSupplier,
        resolutions,
      });
      persistSession(reconciled);
      await commitImportSession(session.id, trimmedSupplier || null);
      handleClose();
      onSaved();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.error ?? 'Inventory import failed. Review the products and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Import Purchase Bill</Text>
            <Text style={styles.subtitle}>Review every product before it changes inventory.</Text>
          </View>
          <ModalCloseButton onPress={handleClose} accessibilityLabel="Close purchase bill import" />
        </View>

        {!review ? (
          <View style={styles.center}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.cameraTitle}>Photo your supplier bill</Text>
            <Text style={styles.cameraSub}>
              SmartBiz extracts the supplier and products, then lets you correct everything before saving.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.primaryBtn} onPress={pickFromCamera} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.primaryBtnText}>Open Camera</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={pickFromGallery} disabled={loading}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Scan complete</Text>
                <Text style={styles.summaryText}>{session?.summary}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Supplier</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={supplierName}
                  onChangeText={(value) => {
                    setSupplierName(value);
                    setShowSupplierSuggestions(true);
                  }}
                  onFocus={() => setShowSupplierSuggestions(supplierSuggestions.length > 0)}
                  placeholder="Supplier name if known"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
                {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                  <View style={styles.supplierSuggestions}>
                    {supplierSuggestions.map((name) => (
                      <Pressable
                        key={name}
                        style={styles.supplierSuggestion}
                        onPress={() => {
                          setSupplierName(name);
                          setSupplierSuggestions([]);
                          setShowSupplierSuggestions(false);
                        }}
                      >
                        <Ionicons name="business-outline" size={17} color={Colors.textMuted} />
                        <Text style={styles.supplierSuggestionText}>{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Text style={styles.fieldHint}>Detected from the bill when possible. A new name is linked when you save.</Text>
              </View>

              {!!review.warnings.length && (
                <View style={styles.warningCard}>
                  {review.warnings.map((warning) => (
                    <Text key={warning} style={styles.warningText}>{warning}</Text>
                  ))}
                </View>
              )}

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Review products</Text>
                <Text style={styles.reviewSub}>Tap a product to correct its match, quantity, cost, or category.</Text>
              </View>

              {uniqueItems.map((item) => {
                const draft = drafts[item.normalizedName];
                if (!draft) return null;
                const suggestions = review.matchSuggestions[item.normalizedName] ?? [];
                const expanded = expandedItem === item.normalizedName;
                const errors = fieldErrors[item.normalizedName] ?? [];
                return (
                  <View
                    key={item.normalizedName}
                    style={[
                      styles.productRow,
                      expanded && styles.productRowExpanded,
                      draft.action === 'EXCLUDE' && styles.productRowExcluded,
                      errors.length > 0 && styles.productRowError,
                    ]}
                  >
                    <Pressable
                      style={styles.productSummary}
                      onPress={() => setExpandedItem(expanded ? null : item.normalizedName)}
                      accessibilityRole="button"
                      accessibilityLabel={`${expanded ? 'Collapse' : 'Edit'} ${draft.productName ?? item.sourceName}`}
                    >
                      <View style={styles.productSummaryCopy}>
                        <Text style={styles.matchName} numberOfLines={1}>{draft.productName || item.sourceName}</Text>
                        <Text style={styles.matchMeta}>
                          Qty {draft.quantity || '?'} · NPR {draft.rate || '?'} · {resolutionLabel(draft)}
                        </Text>
                      </View>
                      <Ionicons name={expanded ? 'chevron-up' : 'create-outline'} size={20} color={Colors.textMuted} />
                    </Pressable>

                    {expanded && (
                      <View style={styles.editor}>
                        <View style={styles.choiceSection}>
                          <Text style={styles.editorLabel}>Inventory action</Text>
                          <View style={styles.chipWrap}>
                            {suggestions.map((suggestion: ProductSuggestion) => (
                              <Pressable
                                key={suggestion.productId}
                                style={[
                                  styles.choiceChip,
                                  draft.action === 'MATCH_EXISTING' && draft.productId === suggestion.productId && styles.choiceChipActive,
                                ]}
                                onPress={() => updateDraft(item.normalizedName, {
                                  action: 'MATCH_EXISTING',
                                  productId: suggestion.productId,
                                  productName: suggestion.productName,
                                  category: draft.category || suggestion.category,
                                })}
                              >
                                <Text style={[
                                  styles.choiceChipText,
                                  draft.action === 'MATCH_EXISTING' && draft.productId === suggestion.productId && styles.choiceChipTextActive,
                                ]}>
                                  {suggestion.productName}
                                </Text>
                              </Pressable>
                            ))}
                            <Pressable
                              style={[styles.choiceChip, draft.action === 'CREATE_NEW' && styles.choiceChipActive]}
                              onPress={() => updateDraft(item.normalizedName, {
                                action: 'CREATE_NEW',
                                productId: null,
                                productName: item.sourceName,
                              })}
                            >
                              <Text style={[styles.choiceChipText, draft.action === 'CREATE_NEW' && styles.choiceChipTextActive]}>
                                Create new
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles.choiceChip, draft.action === 'EXCLUDE' && styles.choiceChipDanger]}
                              onPress={() => updateDraft(item.normalizedName, { action: 'EXCLUDE', productId: null })}
                            >
                              <Text style={[styles.choiceChipText, draft.action === 'EXCLUDE' && styles.choiceChipDangerText]}>
                                Exclude
                              </Text>
                            </Pressable>
                          </View>
                        </View>

                        {draft.action === 'EXCLUDE' ? (
                          <Text style={styles.excludedHint}>This product will not be imported.</Text>
                        ) : (
                          <>
                            {draft.action === 'CREATE_NEW' ? (
                              <View style={styles.editorField}>
                                <Text style={styles.editorLabel}>Product name</Text>
                                <TextInput
                                  style={styles.editorInput}
                                  value={draft.productName ?? ''}
                                  onChangeText={(value) => updateDraft(item.normalizedName, { productName: value })}
                                  placeholder="Product name"
                                  placeholderTextColor={Colors.textMuted}
                                />
                              </View>
                            ) : (
                              <Text style={styles.matchHint}>The existing product name and selling price will stay unchanged.</Text>
                            )}

                            <View style={styles.numberRow}>
                              <View style={styles.numberField}>
                                <Text style={styles.editorLabel}>Quantity</Text>
                                <TextInput
                                  style={styles.editorInput}
                                  value={draft.quantity}
                                  onChangeText={(value) => updateDraft(item.normalizedName, { quantity: value })}
                                  keyboardType="number-pad"
                                  placeholder="1"
                                  placeholderTextColor={Colors.textMuted}
                                />
                              </View>
                              <View style={styles.numberField}>
                                <Text style={styles.editorLabel}>Unit cost (NPR)</Text>
                                <TextInput
                                  style={styles.editorInput}
                                  value={draft.rate}
                                  onChangeText={(value) => updateDraft(item.normalizedName, { rate: value })}
                                  keyboardType="decimal-pad"
                                  placeholder="0.00"
                                  placeholderTextColor={Colors.textMuted}
                                />
                              </View>
                            </View>

                            <View style={styles.editorField}>
                              <Text style={styles.editorLabel}>Category</Text>
                              <CategoryPicker
                                value={draft.category ?? ''}
                                onChange={(value) => updateDraft(item.normalizedName, { category: value || null })}
                                categories={categories}
                                onCreateCategory={handleCreateCategory}
                              />
                            </View>
                          </>
                        )}

                        {errors.length > 0 && (
                          <View style={styles.fieldErrorBox}>
                            {errors.map((message) => <Text key={message} style={styles.fieldErrorText}>{message}</Text>)}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.footerCloseBtn} onPress={handleClose} disabled={saving}>
                <Text style={styles.footerCloseBtnText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (saving || loading || includedCount === 0) && styles.disabledBtn]}
                onPress={() => void handleSave()}
                disabled={saving || loading || includedCount === 0}
              >
                {saving
                  ? <ActivityIndicator color={Colors.textOnPrimary} />
                  : <Text style={styles.saveBtnText}>Save to Inventory ({includedCount})</Text>}
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  subtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cameraTitle: { fontSize: 20, fontWeight: '700', color: Colors.textDark, textAlign: 'center' },
  cameraSub: { maxWidth: 360, fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  primaryBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 28 },
  summaryCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  summaryText: { marginTop: 5, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  fieldInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textDark,
    backgroundColor: Colors.card,
  },
  fieldHint: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  supplierSuggestions: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.card,
  },
  supplierSuggestion: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  supplierSuggestionText: { flex: 1, fontSize: 14, color: Colors.textDark },
  warningCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
    gap: 6,
  },
  warningText: { fontSize: 13, lineHeight: 18, color: Colors.danger, fontWeight: '500' },
  sectionHeading: { gap: 4, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  reviewSub: { fontSize: 13, lineHeight: 18, color: Colors.textMuted },
  productRow: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  productRowExpanded: { borderColor: Colors.primary },
  productRowExcluded: { opacity: 0.72 },
  productRowError: { borderColor: Colors.danger },
  productSummary: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  productSummaryCopy: { flex: 1, gap: 4 },
  matchName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  matchMeta: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  editor: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 14,
    gap: 14,
    backgroundColor: Colors.backgroundAlt,
  },
  choiceSection: { gap: 7 },
  editorField: { gap: 6 },
  editorLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  editorInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textDark,
    backgroundColor: Colors.card,
  },
  numberRow: { flexDirection: 'row', gap: 10 },
  numberField: { flex: 1, gap: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceChipDanger: { backgroundColor: Colors.dangerLight, borderColor: Colors.danger },
  choiceChipText: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  choiceChipTextActive: { color: Colors.textOnPrimary },
  choiceChipDangerText: { color: Colors.danger },
  matchHint: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  excludedHint: { fontSize: 13, color: Colors.textMuted },
  fieldErrorBox: { gap: 3 },
  fieldErrorText: { fontSize: 12, lineHeight: 17, color: Colors.danger },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerCloseBtn: {
    minWidth: 82,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  footerCloseBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  saveBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  disabledBtn: { opacity: 0.48 },
  error: {
    borderRadius: 12,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    color: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
