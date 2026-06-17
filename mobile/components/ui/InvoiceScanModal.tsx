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
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from './colors';
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

function groupItems(items: ImportReviewItem[]) {
  const map = new Map<string, ImportReviewItem>();
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSession(initialSession ?? null);
    setSupplierName(initialSession?.review?.supplierName ?? '');
    setError('');
  }, [initialSession, visible]);

  const review = session?.review ?? null;
  const uniqueItems = useMemo(
    () => (review ? groupItems(review.candidateProducts) : []),
    [review],
  );

  const persistSession = (next: ImportSession) => {
    setSession(next);
    setSupplierName(next.review?.supplierName ?? supplierName);
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

  const updateResolution = async (normalizedName: string, patch: Partial<ProductResolution>) => {
    if (!session?.id || !review) return;
    setLoading(true);
    setError('');
    try {
      const current = review.resolutions[normalizedName];
      const next = await reconcileImportSession(session.id, {
        supplierName,
        resolutions: [{ ...current, ...patch }],
      });
      persistSession(next);
    } catch {
      setError('Could not update that inventory match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierBlur = async () => {
    if (!session?.id || !review) return;
    const next = await reconcileImportSession(session.id, {
      supplierName,
      resolutions: [],
    });
    persistSession(next);
  };

  const handleSave = async () => {
    if (!session?.id) return;
    setSaving(true);
    setError('');
    try {
      await commitImportSession(session.id, supplierName || null);
      handleClose();
      onSaved();
    } catch {
      setError('Inventory import failed. Please review the matches and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textDark} />
          </Pressable>
          <Text style={styles.title}>Import Purchase Bill</Text>
          <View style={{ width: 36 }} />
        </View>

        {!review ? (
          <View style={styles.center}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.cameraTitle}>Photo your supplier bill</Text>
            <Text style={styles.cameraSub}>
              SmartBiz will remember this bill in the current import session and help you resolve
              inventory matches before saving.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={pickFromCamera} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
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
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Current Import Session</Text>
                <Text style={styles.summaryText}>{session?.summary}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Supplier</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={supplierName}
                  onChangeText={setSupplierName}
                  onEndEditing={handleSupplierBlur}
                  placeholder="Supplier name if known"
                  placeholderTextColor={Colors.textMuted}
                />
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

              <Text style={styles.reviewSub}>Resolve product matches before saving to inventory</Text>

              {uniqueItems.map((item) => {
                const resolution = review.resolutions[item.normalizedName];
                const suggestions = review.matchSuggestions[item.normalizedName] ?? [];
                return (
                  <View key={item.normalizedName} style={styles.rowCard}>
                    <Text style={styles.matchName}>{item.sourceName}</Text>
                    <Text style={styles.matchMeta}>
                      Qty {item.quantity} • Rate NPR {item.rate} • {resolutionLabel(resolution)}
                    </Text>

                    {!!item.category && (
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{item.category}</Text>
                      </View>
                    )}

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
                              category: item.category ?? suggestion.category,
                              supplier: supplierName || suggestion.supplier,
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
                            productName: item.sourceName,
                            category: item.category,
                            supplier: supplierName || item.supplier,
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

              {!!review.insightCards.length && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightTitle}>Strategic Notes</Text>
                  {review.insightCards.map((card) => (
                    <View key={card.type} style={styles.insightCard}>
                      <Text style={styles.insightCardTitle}>{card.title}</Text>
                      <Text style={styles.insightCardText}>{card.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving || loading}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    Save to Inventory ({review.candidateProducts.length})
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cameraTitle: { fontSize: 20, fontWeight: '700', color: Colors.textDark, textAlign: 'center' },
  cameraSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  summaryCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  summaryText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textDark,
    backgroundColor: Colors.card,
  },
  warningCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
    gap: 6,
  },
  warningText: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
  reviewSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  rowCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  matchName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  matchMeta: { fontSize: 12, color: Colors.textMuted },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryPillText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceChipDanger: { backgroundColor: Colors.dangerLight, borderColor: Colors.danger },
  choiceChipText: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  choiceChipTextActive: { color: Colors.textOnPrimary },
  choiceChipDangerText: { color: Colors.danger },
  insightSection: { gap: 10, marginTop: 8 },
  insightTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  insightCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  insightCardText: { marginTop: 6, fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  footer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: {
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
