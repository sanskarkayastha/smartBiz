import { View, Text, FlatList, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import SearchBar from '@/components/ui/SearchBar';
import StatusBadge from '@/components/ui/StatusBadge';
import VoiceButton from '@/components/ui/VoiceButton';
import InvoiceScanModal from '@/components/ui/InvoiceScanModal';
import CategoryPicker from '@/components/ui/CategoryPicker';
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal';
import ProductImageField, { type SelectedProductImage } from '@/components/ui/ProductImageField';
import ProductImageThumbnail from '@/components/ui/ProductImageThumbnail';
import { inventoryService, Product, CreateProductPayload, ProductFilters, type Category, type PaymentStatus } from '@/services/inventory';
import { parseVoiceForProducts, ParsedProduct } from '@/services/ai';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

function getStatus(product: Product): StockStatus {
  if (product.quantity === 0) return 'Out of Stock';
  if (product.reorderLevel != null && product.quantity <= product.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

function skuLine(product: Product): string {
  const parts: string[] = [];
  if (product.sku) parts.push(`SKU: ${product.sku}`);
  if (product.category) parts.push(product.category);
  return parts.join(' · ');
}

const PLACEHOLDER_COLORS = ['#FEE2E2', '#FEF9C3', '#F3E8FF', '#E0F2FE', '#FEF3C7'];

export default function Inventory() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [pendingCategory, setPendingCategory] = useState('');
  const [pendingStockStatus, setPendingStockStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CreateProductPayload>>({});
  const [editImage, setEditImage] = useState<SelectedProductImage | null>(null);
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [editDetailsSaved, setEditDetailsSaved] = useState(false);
  const [editImageError, setEditImageError] = useState('');
  const [editImageStage, setEditImageStage] = useState<'idle' | 'details' | 'upload' | 'attach'>('idle');
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockSaving, setRestockSaving] = useState(false);
  const [restockForm, setRestockForm] = useState({
    quantityAdded: '1',
    unitCost: '',
    supplier: '',
    paymentStatus: 'DUE' as PaymentStatus,
    amountPaidNow: '',
    note: '',
  });
  const [showScanModal, setShowScanModal] = useState(false);
  const [voiceProducts, setVoiceProducts] = useState<ParsedProduct[] | undefined>(undefined);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [missingBarcode, setMissingBarcode] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    inventoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const hasLoaded = useRef(false);
  const filtersRef = useRef({ search: '', category: '', stockStatus: '' });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = (): ProductFilters | undefined => {
    const { search: s, category, stockStatus } = filtersRef.current;
    const f: ProductFilters = {};
    if (s.trim()) f.search = s.trim();
    if (category.trim()) f.category = category.trim();
    if (stockStatus) f.stockStatus = stockStatus;
    return Object.keys(f).length ? f : undefined;
  };

  const load = useCallback(async () => {
    try {
      const data = await inventoryService.getProducts(0, 20, buildFilters());
      setProducts(data.content);
      setCurrentPage(0);
      setHasNext(data.hasNext);
      hasLoaded.current = true;
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await inventoryService.getProducts(nextPage, 20, buildFilters());
      setProducts((prev) => [...prev, ...data.content]);
      setCurrentPage(nextPage);
      setHasNext(data.hasNext);
    } catch {
      // silently fail; user can tap again
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (hasLoaded.current) setRefreshing(true);
    load();
  }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    filtersRef.current.search = text;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => load(), 400);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!text.trim()) { setSuggestions([]); return; }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const data = await inventoryService.getProducts(0, 5, { search: text });
        setSuggestions(data.content.map((p) => p.name));
      } catch { /* ignore */ }
    }, 300);
  };

  const openFilterSheet = () => {
    setPendingCategory(filterCategory);
    setPendingStockStatus(filterStockStatus);
    setShowFilterSheet(true);
  };

  const applyFilters = () => {
    filtersRef.current.category = pendingCategory;
    filtersRef.current.stockStatus = pendingStockStatus;
    setFilterCategory(pendingCategory);
    setFilterStockStatus(pendingStockStatus);
    setShowFilterSheet(false);
    load();
  };

  const clearFilters = () => {
    filtersRef.current.category = '';
    filtersRef.current.stockStatus = '';
    setPendingCategory('');
    setPendingStockStatus('');
    setFilterCategory('');
    setFilterStockStatus('');
    setShowFilterSheet(false);
    load();
  };

  const activeFilterCount = (filterCategory.trim() ? 1 : 0) + (filterStockStatus ? 1 : 0);

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      costPrice: product.costPrice ?? undefined,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel ?? undefined,
      supplier: product.supplier ?? undefined,
      barcode: product.barcode ?? undefined,
    });
    setEditImage(null);
    setEditRemoveImage(false);
    setEditDetailsSaved(false);
    setEditImageError('');
    setEditImageStage('idle');
    setShowEditModal(true);
  };

  const handleBarcodeLookup = async (code: string) => {
    setShowBarcodeScanner(false);
    try {
      const product = await inventoryService.getProductByBarcode(code);
      openEditModal(product);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setMissingBarcode(code);
        return;
      }

      Alert.alert('Scan Failed', 'Could not look up that code right now.');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editForm.name?.trim()) {
      Alert.alert('Validation', 'Product name is required');
      return;
    }
    if (editForm.price == null || editForm.quantity == null) {
      Alert.alert('Validation', 'Price and quantity are required');
      return;
    }
    if (!editingProduct) return;
    let productDetailsSaved = editDetailsSaved;
    setEditSaving(true);
    setEditImageError('');
    try {
      if (!editDetailsSaved) {
        setEditImageStage('details');
        await inventoryService.updateProduct(editingProduct.id, editForm);
        setEditDetailsSaved(true);
        productDetailsSaved = true;
      }

      if (editImage) {
        let confirmation: Awaited<ReturnType<typeof inventoryService.uploadImageToCloudinary>> | null = null;
        try {
          setEditImageStage('upload');
          const upload = await inventoryService.requestImageUploadSignature(editingProduct.id);
          confirmation = await inventoryService.uploadImageToCloudinary(editImage, upload);
          setEditImageStage('attach');
          await inventoryService.attachProductImage(editingProduct.id, confirmation);
        } catch (imageError) {
          if (confirmation) {
            await inventoryService.discardProductImage(editingProduct.id, confirmation).catch(() => {});
          }
          throw imageError;
        }
      } else if (editRemoveImage && editingProduct.imageUrl) {
        setEditImageStage('attach');
        await inventoryService.removeProductImage(editingProduct.id);
      }

      setShowEditModal(false);
      load();
    } catch (error) {
      if (productDetailsSaved) {
        setEditImageError(error instanceof Error ? error.message : 'The product image could not be updated.');
        load();
      } else {
        Alert.alert('Error', 'Failed to update product');
      }
    } finally {
      setEditSaving(false);
      setEditImageStage('idle');
    }
  };

  const openRestockModal = (product: Product) => {
    setRestockingProduct(product);
    setRestockForm({
      quantityAdded: '1',
      unitCost: product.costPrice != null ? String(product.costPrice) : '',
      supplier: product.supplier ?? '',
      paymentStatus: 'DUE',
      amountPaidNow: '',
      note: '',
    });
    setShowRestockModal(true);
  };

  const handleRestockProduct = async () => {
    if (!restockingProduct) return;
    const quantityAdded = parseInt(restockForm.quantityAdded, 10);
    const unitCost = parseFloat(restockForm.unitCost);
    const trimmedSupplier = restockForm.supplier.trim();
    const canTrackSupplierPayment = !!trimmedSupplier && quantityAdded > 0 && !Number.isNaN(unitCost) && unitCost > 0;
    const purchaseTotal = canTrackSupplierPayment ? quantityAdded * unitCost : 0;

    if (Number.isNaN(quantityAdded) || quantityAdded <= 0) {
      Alert.alert('Validation', 'Quantity added must be at least 1');
      return;
    }
    if (Number.isNaN(unitCost) || unitCost <= 0) {
      Alert.alert('Validation', 'Unit cost must be greater than 0');
      return;
    }
    if (canTrackSupplierPayment && restockForm.paymentStatus === 'PARTIAL') {
      const paidNow = parseFloat(restockForm.amountPaidNow);
      if (Number.isNaN(paidNow) || paidNow <= 0) {
        Alert.alert('Validation', 'Enter how much you paid now for this partial payment');
        return;
      }
      if (paidNow >= purchaseTotal) {
        Alert.alert('Validation', 'Partial payment must be less than the full purchase total');
        return;
      }
    }

    setRestockSaving(true);
    try {
      await inventoryService.restockProduct(restockingProduct.id, {
        quantityAdded,
        unitCost,
        supplier: trimmedSupplier || undefined,
        paymentStatus: restockForm.paymentStatus,
        amountPaidNow: canTrackSupplierPayment && restockForm.paymentStatus === 'PARTIAL'
          ? parseFloat(restockForm.amountPaidNow)
          : undefined,
        note: restockForm.note.trim() || undefined,
      });
      setShowRestockModal(false);
      setRestockingProduct(null);
      load();
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Failed to restock product';
      Alert.alert('Error', message);
    } finally {
      setRestockSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert('Delete Product', `Delete "${product.name}"? This cannot be undone.`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await inventoryService.deleteProduct(product.id);
            load();
          } catch {
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const handleVoiceResult = async (text: string) => {
    try {
      const parsed = await parseVoiceForProducts(text);
      setVoiceProducts(parsed.length > 0 ? parsed : [{ name: '', quantity: 1, rate: 0 }]);
      setShowScanModal(true);
    } catch {
      Alert.alert('Error', 'Could not parse voice input. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Pressable><Ionicons name="notifications-outline" size={24} color={Colors.textDark} /></Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar
          placeholder="Search products, SKU..."
          value={search}
          onChangeText={handleSearchChange}
          showFilter
          onFilterPress={openFilterSheet}
          filterActive={activeFilterCount > 0}
        />
        {suggestions.length > 0 && search.trim() !== '' && (
          <View style={styles.suggestOverlay}>
            {suggestions.map((name) => (
              <Pressable
                key={name}
                style={styles.suggestItem}
                onPress={() => {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
                  setSearch(name);
                  setSuggestions([]);
                  filtersRef.current.search = name;
                  load();
                }}
              >
                <Text style={styles.suggestText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {loading
        ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={products.length === 0 ? styles.listEmpty : styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {search || activeFilterCount > 0 ? 'No matching products' : 'No products yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Tap + to add your first product'}
                </Text>
              </View>
            }
            ListFooterComponent={
              hasNext ? (
                <Pressable style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
                  {loadingMore
                    ? <ActivityIndicator color={Colors.primary} size="small" />
                    : <Text style={styles.loadMoreText}>Load More</Text>}
                </Pressable>
              ) : null
            }
            renderItem={({ item, index }) => {
              const status = getStatus(item);
              const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
              const reorderText = item.reorderLevel != null ? `Reorder at ${item.reorderLevel}` : 'No reorder target';
              const secondaryMeta = item.supplier
                ? `Supplier: ${item.supplier}`
                : item.barcode
                  ? `Code: ${item.barcode}`
                  : 'No supplier or barcode linked';
              return (
                <View style={styles.cardWrapper}>
                  <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }]} onPress={() => openEditModal(item)}>
                    <View style={styles.cardAccent} />
                    <ProductImageThumbnail imageUrl={item.imageUrl} backgroundColor={bgColor} />
                    <View style={styles.productInfo}>
                      <View style={styles.productTopRow}>
                        <View style={styles.productTitleBlock}>
                          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.productSku} numberOfLines={1}>{skuLine(item) || 'Uncategorized product'}</Text>
                        </View>
                        <Pressable
                          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.72 }]}
                          onPress={() => handleDeleteProduct(item)}
                        >
                          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                        </Pressable>
                      </View>

                      <View style={styles.productBottomRow}>
                        <View style={styles.priceBlock}>
                          <Text style={styles.productPrice}>Rs. {item.price.toLocaleString()}</Text>
                          {item.costPrice != null ? (
                            <Text style={styles.productCostPrice}>Cost: Rs. {item.costPrice.toLocaleString()}</Text>
                          ) : (
                            <Text style={styles.productCostPrice}>Cost not set</Text>
                          )}
                        </View>
                        <View style={styles.productMetaSide}>
                          <StatusBadge status={status} />
                          <Text style={styles.productQty}>{item.quantity} units</Text>
                        </View>
                      </View>

                      <Text style={styles.productMetaLine} numberOfLines={1}>
                        {item.reorderLevel != null ? `${reorderText}  |  ${secondaryMeta}` : secondaryMeta}
                      </Text>

                      <View style={styles.cardActionRow}>
                        <Pressable style={styles.restockBtn} onPress={() => openRestockModal(item)}>
                          <Ionicons name="add-circle-outline" size={14} color={Colors.success} />
                          <Text style={styles.restockBtnText}>Restock</Text>
                        </Pressable>
                        <Pressable style={styles.editBtn} onPress={() => openEditModal(item)}>
                          <Ionicons name="create-outline" size={14} color={Colors.primary} />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            }}
          />
        )}

      {/* FAB stack */}
      <View style={styles.fabStack}>
        <VoiceButton
          onResult={handleVoiceResult}
          size={22}
          style={styles.fabSecondary}
          color={Colors.textOnPrimary}
        />
        <Pressable style={({ pressed }) => [styles.fabSecondary, pressed && { opacity: 0.82 }]} onPress={() => setShowBarcodeScanner(true)}>
          <Ionicons name="scan-outline" size={22} color={Colors.textOnPrimary} />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.fabSecondary, pressed && { opacity: 0.82 }]} onPress={() => { setVoiceProducts(undefined); setShowScanModal(true); }}>
          <Ionicons name="camera-outline" size={22} color={Colors.textOnPrimary} />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.82 }]} onPress={() => router.push('/add-product')}>
          <Ionicons name="add" size={28} color={Colors.textOnPrimary} />
        </Pressable>
      </View>

      <InvoiceScanModal
        visible={showScanModal}
        onClose={() => { setShowScanModal(false); setVoiceProducts(undefined); }}
        onSaved={() => load()}
        initialProducts={voiceProducts}
      />

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanned={(value) => void handleBarcodeLookup(value)}
        title="Find product by code"
        subtitle="Scan a product barcode or QR code to open its details."
      />

      <Modal visible={!!missingBarcode} animationType="fade" transparent onRequestClose={() => setMissingBarcode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmSheet}>
            <View style={styles.confirmIcon}>
              <Ionicons name="scan-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.confirmTitle}>Code not found</Text>
            <Text style={styles.confirmText}>
              This barcode or QR code is not linked to a product yet. Would you like to create one now?
            </Text>
            {missingBarcode ? (
              <Text style={styles.confirmCode} numberOfLines={1}>
                {missingBarcode}
              </Text>
            ) : null}
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmSecondaryBtn} onPress={() => setMissingBarcode(null)}>
                <Text style={styles.confirmSecondaryText}>Not now</Text>
              </Pressable>
              <Pressable
                style={styles.confirmPrimaryBtn}
                onPress={() => {
                  const code = missingBarcode;
                  setMissingBarcode(null);
                  if (code) {
                    router.push({ pathname: '/add-product', params: { barcode: code } });
                  }
                }}
              >
                <Text style={styles.confirmPrimaryText}>Add Product</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <ModalCloseButton onPress={() => { if (!editSaving) setShowEditModal(false); }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={styles.label}>Product Image</Text>
            <ProductImageField
              existingImageUrl={editingProduct?.imageUrl}
              selectedImage={editImage}
              removed={editRemoveImage}
              onSelect={(image) => {
                setEditImage(image);
                setEditRemoveImage(false);
                setEditImageError('');
              }}
              onRemove={() => {
                setEditImage(null);
                setEditRemoveImage(!!editingProduct?.imageUrl);
                setEditImageError('');
              }}
              disabled={editSaving}
            />

            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rice"
              value={editForm.name}
              onChangeText={(v) => setEditForm((f) => ({ ...f, name: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={styles.input}
              placeholder="Stock keeping unit"
              value={editForm.sku}
              onChangeText={(v) => setEditForm((f) => ({ ...f, sku: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Category</Text>
            <CategoryPicker
              value={editForm.category ?? ''}
              onChange={(v) => setEditForm((f) => ({ ...f, category: v || undefined }))}
              categories={categories}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Cost Price (Rs)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={String(editForm.costPrice ?? '')}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, costPrice: v ? parseFloat(v) : undefined }))}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Selling Price (Rs) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={String(editForm.price ?? '')}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, price: v ? parseFloat(v) : undefined }))}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>Quantity (manual correction) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={String(editForm.quantity ?? '')}
              onChangeText={(v) => setEditForm((f) => ({ ...f, quantity: v ? parseInt(v) : undefined }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Reorder Level</Text>
            <TextInput
              style={styles.input}
              placeholder="Low stock threshold"
              keyboardType="number-pad"
              value={String(editForm.reorderLevel ?? '')}
              onChangeText={(v) => setEditForm((f) => ({ ...f, reorderLevel: v ? parseInt(v) : undefined }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Supplier</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ABC Traders"
              value={editForm.supplier ?? ''}
              onChangeText={(v) => setEditForm((f) => ({ ...f, supplier: v || undefined }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Barcode / QR</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional code for fast lookup"
              value={editForm.barcode ?? ''}
              onChangeText={(v) => setEditForm((f) => ({ ...f, barcode: v }))}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {!!editImageError && (
              <View style={styles.imageErrorBox}>
                <Text style={styles.imageErrorTitle}>Product details saved</Text>
                <Text style={styles.imageErrorText}>{editImageError}</Text>
                <Text style={styles.imageErrorHint}>Tap Retry Image below or close and try again later.</Text>
              </View>
            )}

            </ScrollView>

            <Text style={styles.editHelpText}>
              Use this screen for manual corrections. When new stock arrives, use the restock action so supplier dues can be tracked separately.
            </Text>

            <Pressable style={({ pressed }) => [styles.saveBtn, editSaving && { opacity: 0.7 }, pressed && !editSaving && { opacity: 0.85 }]} onPress={handleUpdateProduct} disabled={editSaving}>
              {editSaving ? (
                <>
                  <ActivityIndicator color={Colors.textOnPrimary} />
                  <Text style={styles.saveBtnText}>
                    {editImageStage === 'details' ? 'Saving changes...' : editImageStage === 'upload' ? 'Uploading image...' : 'Attaching image...'}
                  </Text>
                </>
              ) : (
                <Text style={styles.saveBtnText}>{editDetailsSaved && editImageError ? 'Retry Image' : 'Save Changes'}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRestockModal} animationType="slide" transparent onRequestClose={() => setShowRestockModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Restock {restockingProduct?.name}</Text>
                <Text style={styles.modalSubtitle}>Add incoming stock and track any unpaid supplier amount.</Text>
              </View>
              <ModalCloseButton onPress={() => setShowRestockModal(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Quantity Added *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="number-pad"
                    value={restockForm.quantityAdded}
                    onChangeText={(v) => setRestockForm((f) => ({ ...f, quantityAdded: v }))}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Unit Cost (Rs) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={restockForm.unitCost}
                    onChangeText={(v) => setRestockForm((f) => ({ ...f, unitCost: v }))}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.label}>Supplier</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank if this restock should not affect supplier dues"
                value={restockForm.supplier}
                onChangeText={(v) => setRestockForm((f) => ({ ...f, supplier: v }))}
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Note</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekly refill"
                value={restockForm.note}
                onChangeText={(v) => setRestockForm((f) => ({ ...f, note: v }))}
                placeholderTextColor={Colors.textMuted}
              />

              {!!restockForm.supplier.trim() && parseInt(restockForm.quantityAdded, 10) > 0 && !Number.isNaN(parseFloat(restockForm.unitCost)) && parseFloat(restockForm.unitCost) > 0 && (
                <View style={styles.restockPaymentCard}>
                  <View style={styles.paymentHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentTitle}>Supplier payment</Text>
                      <Text style={styles.paymentSubtext}>Choose whether this restock was paid now, due, or only partly paid.</Text>
                    </View>
                    <View style={styles.totalPill}>
                      <Text style={styles.totalPillLabel}>Purchase Total</Text>
                      <Text style={styles.totalPillValue}>
                        Rs. {(parseInt(restockForm.quantityAdded, 10) * parseFloat(restockForm.unitCost)).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentChoiceRow}>
                    {([
                      { value: 'PAID', label: 'Paid' },
                      { value: 'DUE', label: 'Due' },
                      { value: 'PARTIAL', label: 'Partial' },
                    ] as const).map((option) => {
                      const active = restockForm.paymentStatus === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[styles.paymentChoice, active && styles.paymentChoiceActive]}
                          onPress={() => setRestockForm((f) => ({ ...f, paymentStatus: option.value }))}
                        >
                          <Text style={[styles.paymentChoiceText, active && styles.paymentChoiceTextActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {restockForm.paymentStatus === 'PARTIAL' && (
                    <>
                      <Text style={styles.label}>Amount Paid Now (Rs.)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={restockForm.amountPaidNow}
                        onChangeText={(v) => setRestockForm((f) => ({ ...f, amountPaidNow: v }))}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </>
                  )}

                  <View style={styles.unpaidBox}>
                    <Text style={styles.unpaidLabel}>Unpaid Amount</Text>
                    <Text style={styles.unpaidValue}>
                      Rs. {(
                        restockForm.paymentStatus === 'PAID'
                          ? 0
                          : restockForm.paymentStatus === 'DUE'
                            ? parseInt(restockForm.quantityAdded, 10) * parseFloat(restockForm.unitCost)
                            : Math.max(
                                0,
                                (parseInt(restockForm.quantityAdded, 10) * parseFloat(restockForm.unitCost)) -
                                  (!Number.isNaN(parseFloat(restockForm.amountPaidNow)) ? parseFloat(restockForm.amountPaidNow) : 0)
                              )
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <Pressable style={({ pressed }) => [styles.saveBtn, restockSaving && { opacity: 0.7 }, pressed && !restockSaving && { opacity: 0.85 }]} onPress={handleRestockProduct} disabled={restockSaving}>
              {restockSaving ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>Save Restock</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter Sheet */}
      <Modal visible={showFilterSheet} animationType="slide" transparent onRequestClose={() => setShowFilterSheet(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.filterSheet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <ModalCloseButton onPress={() => setShowFilterSheet(false)} />
            </View>

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
              {[{ id: 0, name: '' }, ...categories].map((c) => {
                const label = c.name || 'All';
                const active = pendingCategory === c.name;
                return (
                  <Pressable key={c.id} style={[styles.pill, active && styles.pillActive]} onPress={() => setPendingCategory(c.name)}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Stock Status</Text>
            <View style={styles.pillRow}>
              {(['', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((s) => {
                const label = s === '' ? 'All' : s === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock';
                const active = pendingStockStatus === s;
                return (
                  <Pressable key={s} style={[styles.pill, active && styles.pillActive]} onPress={() => setPendingStockStatus(s)}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filterBtnRow}>
              <Pressable style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  list: { paddingHorizontal: 16, paddingBottom: 84 },
  listEmpty: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textDark },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  cardWrapper: { marginBottom: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  imageErrorBox: { marginTop: 14, borderRadius: 12, padding: 12, backgroundColor: Colors.warningLight },
  imageErrorTitle: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  imageErrorText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: Colors.danger },
  imageErrorHint: { marginTop: 3, fontSize: 12, color: Colors.textMuted },
  productInfo: { flex: 1, minWidth: 0 },
  productTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  productTitleBlock: { flex: 1, minWidth: 0 },
  productName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, lineHeight: 19 },
  productSku: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  productBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, gap: 10 },
  priceBlock: {
    flex: 1,
  },
  productPrice: { fontSize: 18, fontWeight: '800', color: Colors.primary, lineHeight: 22 },
  productCostPrice: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  productMetaSide: { alignItems: 'flex-end', gap: 6 },
  productQty: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  productMetaLine: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  cardActionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  restockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.successLight,
  },
  restockBtnText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  fabStack: { position: 'absolute', bottom: 28, right: 20, alignItems: 'center', gap: 10 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabSecondary: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', opacity: 0.85, elevation: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 16, maxHeight: '90%' },
  confirmSheet: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  confirmText: { fontSize: 14, lineHeight: 21, color: Colors.textMuted, textAlign: 'center' },
  confirmCode: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 12,
    color: Colors.textDark,
    overflow: 'hidden',
  },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  confirmSecondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  confirmPrimaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmPrimaryText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  modalSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textDark },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  editHelpText: { fontSize: 12, lineHeight: 18, color: Colors.textMuted, marginTop: 12 },
  restockPaymentCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    gap: 12,
  },
  paymentHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
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
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  filterSheet: { paddingBottom: 36 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  pillTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  filterBtnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  clearBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  applyBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  applyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textOnPrimary },
  chipScroll: { marginTop: 4 },
  chipScrollContent: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  searchWrapper: { zIndex: 10 },
  suggestOverlay: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 100, backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 8 },
  suggestItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  suggestText: { fontSize: 14, color: Colors.textDark },
});
