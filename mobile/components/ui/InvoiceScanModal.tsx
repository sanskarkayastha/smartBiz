import {
  Modal, View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, TextInput, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from './colors';
import { scanInvoice, ParsedProduct } from '@/services/ai';
import { inventoryService, Product } from '@/services/inventory';

type Row = ParsedProduct & { matchedProduct: Product | null };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialProducts?: ParsedProduct[];
};

type Step = 'camera' | 'processing' | 'review' | 'saving';

export default function InvoiceScanModal({ visible, onClose, onSaved, initialProducts }: Props) {
  const [step, setStep] = useState<Step>(initialProducts ? 'review' : 'camera');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialProducts && initialProducts.length > 0) {
        loadAndMatch(initialProducts);
      } else {
        setStep('camera');
        setImageUri(null);
        setRows([]);
      }
    }
  }, [visible]);

  const loadAndMatch = async (products: ParsedProduct[]) => {
    let existing = existingProducts;
    if (existing.length === 0) {
      try { existing = await inventoryService.getProducts(); setExistingProducts(existing); } catch {}
    }
    const matched = products.map((p) => ({
      ...p,
      matchedProduct: findMatch(p.name, existing),
    }));
    setRows(matched);
    setStep('review');
  };

  const findMatch = (name: string, products: Product[]): Product | null => {
    const lower = name.toLowerCase().trim();
    return products.find((p) => p.name.toLowerCase().trim() === lower) ?? null;
  };

  const pickFromCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) { Alert.alert('Permission required', 'Camera permission is needed to scan invoices.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri, result.assets[0].base64!);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri, result.assets[0].base64!);
    }
  };

  const processImage = async (uri: string, base64: string) => {
    setImageUri(uri);
    setStep('processing');
    try {
      const { products } = await scanInvoice(base64);
      await loadAndMatch(products.length > 0 ? products : [{ name: '', quantity: 1, rate: 0 }]);
    } catch {
      Alert.alert('Error', 'Could not scan invoice. Please try again.');
      setStep('camera');
    }
  };

  const updateRow = (idx: number, field: keyof ParsedProduct, value: string) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'name') {
        const matched = findMatch(value, existingProducts);
        return { ...r, name: value, matchedProduct: matched };
      }
      const num = parseFloat(value) || 0;
      return { ...r, [field]: num };
    }));
  };

  const deleteRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const addRow = () => setRows((prev) => [...prev, { name: '', quantity: 1, rate: 0, matchedProduct: null }]);

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) { Alert.alert('Nothing to save', 'Add at least one product row.'); return; }
    setSaving(true);
    setStep('saving');
    let saved = 0;
    for (const row of validRows) {
      try {
        if (row.matchedProduct) {
          await inventoryService.updateProduct(row.matchedProduct.id, {
            quantity: row.matchedProduct.quantity + Math.round(row.quantity),
          });
        } else {
          await inventoryService.createProduct({
            name: row.name.trim(),
            price: row.rate,
            costPrice: row.rate,
            quantity: Math.round(row.quantity),
          });
        }
        saved++;
      } catch {
        // continue saving others
      }
    }
    setSaving(false);
    if (saved > 0) {
      Alert.alert('Saved', `${saved} product${saved > 1 ? 's' : ''} saved to inventory.`);
      onSaved();
      onClose();
    } else {
      Alert.alert('Error', 'Failed to save products. Please try again.');
      setStep('review');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textDark} />
          </Pressable>
          <Text style={styles.title}>
            {step === 'camera' ? 'Scan Invoice' : step === 'processing' ? 'Scanning...' : step === 'saving' ? 'Saving...' : 'Review Products'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Step: camera picker */}
        {step === 'camera' && (
          <View style={styles.center}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.cameraTitle}>Photo your supplier bill</Text>
            <Text style={styles.cameraSub}>AI will extract product names, quantities, and rates automatically</Text>
            <Pressable style={styles.primaryBtn} onPress={pickFromCamera}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Open Camera</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
            </Pressable>
          </View>
        )}

        {/* Step: processing */}
        {step === 'processing' && (
          <View style={styles.center}>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 24 }} />
            <Text style={styles.processingText}>AI is reading your invoice...</Text>
          </View>
        )}

        {/* Step: review */}
        {step === 'review' && (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.reviewSub}>Review and edit before saving to inventory</Text>

              {rows.map((row, idx) => (
                <View key={idx} style={styles.rowCard}>
                  <View style={styles.rowHeader}>
                    {row.matchedProduct ? (
                      <View style={styles.matchChip}>
                        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                        <Text style={styles.matchText}>Matches: {row.matchedProduct.name}</Text>
                      </View>
                    ) : (
                      <View style={styles.newChip}>
                        <Ionicons name="add-circle-outline" size={12} color="#d97706" />
                        <Text style={styles.newText}>New product</Text>
                      </View>
                    )}
                    <Pressable onPress={() => deleteRow(idx)} style={styles.deleteRowBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>Product Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={row.name}
                    onChangeText={(v) => updateRow(idx, 'name', v)}
                    placeholder="Product name"
                    placeholderTextColor={Colors.textMuted}
                  />

                  <View style={styles.twoCol}>
                    <View style={styles.halfCol}>
                      <Text style={styles.fieldLabel}>Quantity</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={String(row.quantity)}
                        onChangeText={(v) => updateRow(idx, 'quantity', v)}
                        keyboardType="decimal-pad"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.halfCol}>
                      <Text style={styles.fieldLabel}>Rate (Rs)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={String(row.rate)}
                        onChangeText={(v) => updateRow(idx, 'rate', v)}
                        keyboardType="decimal-pad"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <Pressable style={styles.addRowBtn} onPress={addRow}>
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.addRowText}>Add Row</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save to Inventory ({rows.filter((r) => r.name.trim()).length})</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Step: saving */}
        {step === 'saving' && (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.processingText}>Saving products...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  cameraTitle: { fontSize: 20, fontWeight: '700', color: Colors.textDark, textAlign: 'center' },
  cameraSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, width: '100%', justifyContent: 'center' },
  secondaryBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  preview: { width: 200, height: 150, borderRadius: 12, resizeMode: 'cover' },
  processingText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  reviewSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  rowCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  matchChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  matchText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  newChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  newText: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  deleteRowBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.dangerLight, justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 4 },
  fieldInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: Colors.textDark, backgroundColor: Colors.background },
  twoCol: { flexDirection: 'row', gap: 10 },
  halfCol: { flex: 1 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primaryBorder, borderStyle: 'dashed', justifyContent: 'center' },
  addRowText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  footer: { padding: 16, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
