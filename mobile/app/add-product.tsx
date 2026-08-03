import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import InputField from '@/components/ui/InputField';
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import CategoryPicker from '@/components/ui/CategoryPicker';
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal';
import ProductImageField, { type SelectedProductImage } from '@/components/ui/ProductImageField';
import { inventoryService, type Category, type PaymentStatus } from '@/services/inventory';
import { supplierService } from '@/services/suppliers';

export default function AddProduct() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [barcode, setBarcode] = useState(typeof params.barcode === 'string' ? params.barcode : '');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedProductImage | null>(null);
  const [savedProductId, setSavedProductId] = useState<number | null>(null);
  const [imageSaveError, setImageSaveError] = useState('');
  const [saveStage, setSaveStage] = useState<'idle' | 'product' | 'upload' | 'attach'>('idle');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('DUE');
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [supplierSuggestions, setSupplierSuggestions] = useState<string[]>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const supplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inventoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof params.barcode === 'string' && params.barcode.trim()) {
      setBarcode(params.barcode);
    }
  }, [params.barcode]);

  const parsedCost = parseFloat(costPrice);
  const validCost = !Number.isNaN(parsedCost) ? parsedCost : 0;
  const canTrackSupplierPayment = !!supplier.trim() && validCost > 0 && stock > 0;
  const purchaseTotal = canTrackSupplierPayment ? validCost * stock : 0;
  const parsedPaidNow = amountPaidNow ? parseFloat(amountPaidNow) : 0;
  const unpaidTotal = canTrackSupplierPayment
    ? paymentStatus === 'PAID'
      ? 0
      : paymentStatus === 'DUE'
        ? purchaseTotal
        : Math.max(0, purchaseTotal - (!Number.isNaN(parsedPaidNow) ? parsedPaidNow : 0))
    : 0;

  const handleSupplierChange = (value: string) => {
    setSupplier(value);
    if (supplierTimerRef.current) clearTimeout(supplierTimerRef.current);

    if (!value.trim()) {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
      return;
    }

    supplierTimerRef.current = setTimeout(async () => {
      try {
        const data = await supplierService.getSuppliers(0, 5, { search: value });
        setSupplierSuggestions(data.content.map((item) => item.name));
        setShowSupplierSuggestions(true);
      } catch {
        setSupplierSuggestions([]);
        setShowSupplierSuggestions(false);
      }
    }, 250);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    const price = parseFloat(sellingPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid selling price');
      return;
    }
    const costTrimmed = costPrice.trim();
    const cost = costTrimmed !== '' ? parseFloat(costTrimmed) : undefined;

    if (canTrackSupplierPayment && paymentStatus === 'PARTIAL') {
      const partialPaid = parseFloat(amountPaidNow);
      if (Number.isNaN(partialPaid) || partialPaid <= 0) {
        Alert.alert('Error', 'Enter how much you paid now for this partial supplier payment');
        return;
      }
      if (partialPaid >= purchaseTotal) {
        Alert.alert('Error', 'Partial payment must be less than the full purchase total');
        return;
      }
    }

    setSaving(true);
    setSaveStage('product');
    try {
      const createdProduct = await inventoryService.createProduct({
        name: productName.trim(),
        category: category || undefined,
        supplier: supplier.trim() || undefined,
        barcode: barcode.trim() || undefined,
        price,
        costPrice: cost !== undefined && !isNaN(cost) ? cost : undefined,
        quantity: stock,
        ...(canTrackSupplierPayment ? {
          paymentStatus,
          amountPaidNow: paymentStatus === 'PARTIAL' ? parseFloat(amountPaidNow) : undefined,
        } : {}),
      });
      if (selectedImage) {
        try {
          await saveSelectedImage(createdProduct.id);
        } catch (imageError) {
          setSavedProductId(createdProduct.id);
          setImageSaveError(imageError instanceof Error ? imageError.message : 'The product image could not be saved.');
          return;
        }
      }
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to save product. Please try again.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
      setSaveStage('idle');
    }
  };

  const saveSelectedImage = async (productId: number) => {
    if (!selectedImage) return;
    let confirmation: Awaited<ReturnType<typeof inventoryService.uploadImageToCloudinary>> | null = null;
    try {
      setSaveStage('upload');
      const upload = await inventoryService.requestImageUploadSignature(productId);
      confirmation = await inventoryService.uploadImageToCloudinary(selectedImage, upload);
      setSaveStage('attach');
      await inventoryService.attachProductImage(productId, confirmation);
    } catch (error) {
      if (confirmation) {
        await inventoryService.discardProductImage(productId, confirmation).catch(() => {});
      }
      throw error;
    }
  };

  const handleRetryImage = async () => {
    if (!savedProductId) return;
    setSaving(true);
    setImageSaveError('');
    try {
      await saveSelectedImage(savedProductId);
      router.back();
    } catch (error) {
      setImageSaveError(error instanceof Error ? error.message : 'The product image could not be saved.');
    } finally {
      setSaving(false);
      setSaveStage('idle');
    }
  };

  const savingLabel = saveStage === 'product'
    ? 'Saving product...'
    : saveStage === 'upload'
      ? 'Uploading image...'
      : saveStage === 'attach'
        ? 'Attaching image...'
        : 'Save Product';

  if (savedProductId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ModalCloseButton onPress={() => { if (!saving) router.back(); }} />
          <Text style={styles.headerTitle}>Product Saved</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.partialState}>
          <View style={styles.partialIcon}>
            <Ionicons name="checkmark" size={28} color={Colors.success} />
          </View>
          <Text style={styles.partialTitle}>Your inventory details are safe</Text>
          <Text style={styles.partialText}>{imageSaveError}</Text>
          <Text style={styles.partialHint}>Only the image still needs attention.</Text>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleRetryImage} disabled={saving}>
            {saving
              ? <><ActivityIndicator color={Colors.textOnPrimary} /><Text style={styles.saveBtnText}>{savingLabel}</Text></>
              : <><Ionicons name="refresh" size={18} color={Colors.textOnPrimary} /><Text style={styles.saveBtnText}>Retry Image</Text></>}
          </Pressable>
          <Pressable style={styles.doneBtn} onPress={() => router.back()} disabled={saving}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <ModalCloseButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Add Product</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Product Photo</Text>
          <ProductImageField
            selectedImage={selectedImage}
            onSelect={setSelectedImage}
            onRemove={() => setSelectedImage(null)}
            disabled={saving}
          />

          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.fieldsGroup}>
            <InputField
              label="Product Name"
              placeholder="e.g. Wai Wai Noodles"
              value={productName}
              onChangeText={setProductName}
            />

            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Category</Text>
              <CategoryPicker value={category} onChange={setCategory} categories={categories} />
            </View>

            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Supplier</Text>
              <TextInput
                style={styles.supplierInput}
                placeholder="e.g. ABC Traders"
                placeholderTextColor={Colors.textMuted}
                value={supplier}
                onChangeText={handleSupplierChange}
                onBlur={() => setShowSupplierSuggestions(false)}
              />
              {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                <View style={styles.supplierSuggestions}>
                  {supplierSuggestions.map((name) => (
                    <Pressable
                      key={name}
                      style={styles.supplierSuggestionItem}
                      onPress={() => {
                        setSupplier(name);
                        setSupplierSuggestions([]);
                        setShowSupplierSuggestions(false);
                      }}
                    >
                      <Text style={styles.supplierSuggestionText}>{name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Barcode / QR</Text>
              <View style={styles.scanRow}>
                <TextInput
                  style={styles.scanInput}
                  placeholder="Optional code for faster lookup"
                  placeholderTextColor={Colors.textMuted}
                  value={barcode}
                  onChangeText={setBarcode}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable style={styles.scanBtn} onPress={() => setShowScanner(true)}>
                  <Ionicons name="scan-outline" size={18} color={Colors.textOnPrimary} />
                  <Text style={styles.scanBtnText}>Scan</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Pricing & Inventory</Text>
          <View style={styles.fieldsGroup}>
            <View style={styles.row}>
              <InputField
                label="Cost Price"
                placeholder="Rs. 0"
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="decimal-pad"
              />
              <InputField
                label="Selling Price *"
                placeholder="Rs. 0"
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Initial Stock</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setStock((s) => Math.max(0, s - 1))}>
                  <Ionicons name="remove" size={20} color={Colors.textDark} />
                </Pressable>
                <Text style={styles.stockCount}>{stock}</Text>
                <Pressable style={[styles.stepBtn, styles.stepBtnActive]} onPress={() => setStock((s) => s + 1)}>
                  <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
                </Pressable>
              </View>
            </View>
          </View>

          {canTrackSupplierPayment && (
            <>
              <Text style={styles.sectionLabel}>Supplier Payment</Text>
              <View style={styles.paymentCard}>
                <View style={styles.paymentTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentTitle}>Track what is still due</Text>
                    <Text style={styles.paymentSubtext}>
                      SmartBiz will use cost price and quantity to update this supplier automatically.
                    </Text>
                  </View>
                  <View style={styles.totalPill}>
                    <Text style={styles.totalPillLabel}>Purchase Total</Text>
                    <Text style={styles.totalPillValue}>Rs. {purchaseTotal.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={styles.paymentChoiceRow}>
                  {([
                    { value: 'PAID', label: 'Paid' },
                    { value: 'DUE', label: 'Due' },
                    { value: 'PARTIAL', label: 'Partial' },
                  ] as const).map((option) => {
                    const active = paymentStatus === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.paymentChoice, active && styles.paymentChoiceActive]}
                        onPress={() => setPaymentStatus(option.value)}
                      >
                        <Text style={[styles.paymentChoiceText, active && styles.paymentChoiceTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {paymentStatus === 'PARTIAL' && (
                  <InputField
                    label="Amount Paid Now (Rs.)"
                    placeholder="0"
                    value={amountPaidNow}
                    onChangeText={setAmountPaidNow}
                    keyboardType="decimal-pad"
                  />
                )}

                <View style={styles.unpaidBox}>
                  <Text style={styles.unpaidLabel}>Unpaid Amount</Text>
                  <Text style={styles.unpaidValue}>Rs. {unpaidTotal.toLocaleString()}</Text>
                </View>
              </View>
            </>
          )}

          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <><ActivityIndicator color={Colors.textOnPrimary} /><Text style={styles.saveBtnText}>{savingLabel}</Text></>
              : <>
                  <Ionicons name="save-outline" size={18} color={Colors.textOnPrimary} />
                  <Text style={styles.saveBtnText}>{savingLabel}</Text>
                </>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={(value) => {
          setBarcode(value);
          setShowScanner(false);
        }}
        title="Scan product code"
        subtitle="Scan the product barcode or QR code to fill it in automatically."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
    marginTop: 8,
  },
  partialState: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  partialIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  partialTitle: { marginTop: 18, fontSize: 19, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  partialText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: Colors.danger, textAlign: 'center' },
  partialHint: { marginTop: 4, fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  doneBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  fieldsGroup: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  fieldWrapper: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: Colors.textDark },
  supplierInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textDark,
  },
  supplierSuggestions: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  supplierSuggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  supplierSuggestionText: { fontSize: 14, color: Colors.textDark },
  scanRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  scanInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textDark,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scanBtnText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 6,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  stepBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stockCount: { fontSize: 20, fontWeight: '700', color: Colors.textDark, minWidth: 30, textAlign: 'center' },
  paymentCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    gap: 12,
    marginBottom: 20,
  },
  paymentTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  paymentTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  paymentSubtext: { fontSize: 12, lineHeight: 18, color: Colors.textMuted, marginTop: 4 },
  totalPill: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 120,
  },
  totalPillLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  totalPillValue: { fontSize: 16, fontWeight: '800', color: Colors.textDark, marginTop: 4 },
  paymentChoiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  paymentChoice: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentChoiceActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentChoiceText: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  paymentChoiceTextActive: { color: Colors.textOnPrimary },
  unpaidBox: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unpaidLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  unpaidValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
