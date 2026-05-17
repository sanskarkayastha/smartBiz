import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import SearchBar from '@/components/ui/SearchBar';
import FilterTabs from '@/components/ui/FilterTabs';
import StatusBadge from '@/components/ui/StatusBadge';
import { inventoryService, Product, CreateProductPayload } from '@/services/inventory';

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

const TABS = ['All Items', 'Low Stock', 'Out of Stock'];
const PLACEHOLDER_COLORS = ['#FEE2E2', '#FEF9C3', '#F3E8FF', '#E0F2FE', '#FEF3C7'];

export default function Inventory() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState('All Items');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CreateProductPayload>>({});

  const load = useCallback(async () => {
    try {
      const data = await inventoryService.getProducts();
      setProducts(data);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel ?? undefined,
      supplier: product.supplier ?? undefined,
    });
    setShowEditModal(true);
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
    setEditSaving(true);
    try {
      const updated = await inventoryService.updateProduct(editingProduct.id, editForm);
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
      setShowEditModal(false);
    } catch {
      Alert.alert('Error', 'Failed to update product');
    } finally {
      setEditSaving(false);
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
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
          } catch {
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const filtered = products.filter((p) => {
    const status = getStatus(p);
    const term = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term);
    const matchesTab = activeTab === 'All Items' || status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Pressable><Ionicons name="notifications-outline" size={24} color={Colors.textDark} /></Pressable>
      </View>

      {/* Sticky search + filter above the list */}
      <SearchBar placeholder="Search products, SKU..." value={search} onChangeText={setSearch} showFilter />
      <FilterTabs tabs={TABS} active={activeTab} onSelect={setActiveTab} />

      {loading
        ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={filtered.length === 0 ? styles.listEmpty : styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {search || activeTab !== 'All Items' ? 'No matching products' : 'No products yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {search || activeTab !== 'All Items' ? 'Try adjusting your search or filter' : 'Tap + to add your first product'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const status = getStatus(item);
              const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
              return (
                <View style={styles.cardWrapper}>
                  <Pressable style={styles.card} onPress={() => openEditModal(item)}>
                    <View style={[styles.productImage, { backgroundColor: bgColor }]}>
                      <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
                    </View>
                    <View style={styles.productInfo}>
                      <View style={styles.productTopRow}>
                        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                        <StatusBadge status={status} />
                      </View>
                      <Text style={styles.productSku} numberOfLines={1}>{skuLine(item)}</Text>
                      <View style={styles.productBottomRow}>
                        <Text style={styles.productPrice}>Rs. {item.price.toLocaleString()}</Text>
                        <Text style={styles.productQty}>{item.quantity} units</Text>
                      </View>
                    </View>
                  </Pressable>
                  <Pressable style={styles.deleteBtn} onPress={() => handleDeleteProduct(item)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              );
            }}
          />
        )}

      <Pressable style={styles.fab} onPress={() => router.push('/add-product')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

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
            <TextInput
              style={styles.input}
              placeholder="e.g. Grocery"
              value={editForm.category}
              onChangeText={(v) => setEditForm((f) => ({ ...f, category: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Price (Rs) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={String(editForm.price ?? '')}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, price: v ? parseFloat(v) : undefined }))}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={String(editForm.quantity ?? '')}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, quantity: v ? parseInt(v) : undefined }))}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

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

            <Pressable style={[styles.saveBtn, editSaving && { opacity: 0.7 }]} onPress={handleUpdateProduct} disabled={editSaving}>
              {editSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  listEmpty: { flex: 1, paddingHorizontal: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textDark },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  cardWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  card: { flex: 1, flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 12, alignItems: 'center' },
  deleteBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.dangerLight, justifyContent: 'center', alignItems: 'center' },
  productImage: { width: 64, height: 64, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, minWidth: 0 },
  productTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 },
  productName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, flex: 1 },
  productSku: { fontSize: 11, color: Colors.textMuted, marginBottom: 6 },
  productBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  productQty: { fontSize: 12, color: Colors.textMuted },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textDark },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
