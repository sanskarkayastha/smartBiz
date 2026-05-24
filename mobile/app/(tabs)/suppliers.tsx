import {
  View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import SearchBar from '@/components/ui/SearchBar';
import {
  supplierService, Supplier, SupplierProduct,
  CreateSupplierPayload, UpdateSupplierPayload,
} from '@/services/suppliers';

type EditForm = { phone: string; email: string; balanceOwed: string; notes: string };
type CreateForm = { name: string; phone: string; email: string; balanceOwed: string; notes: string };

function emptyEditForm(s: Supplier): EditForm {
  return { phone: s.phone ?? '', email: s.email ?? '', balanceOwed: String(s.balanceOwed), notes: s.notes ?? '' };
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ phone: '', email: '', balanceOwed: '0', notes: '' });
  const [saving, setSaving] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '', phone: '', email: '', balanceOwed: '', notes: '' });
  const [creating, setCreating] = useState(false);

  // View products modal
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await supplierService.getSuppliers(0, 20);
      setSuppliers(data.content);
      setCurrentPage(0);
      setHasNext(data.hasNext);
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
      const data = await supplierService.getSuppliers(nextPage, 20);
      setSuppliers((prev) => [...prev, ...data.content]);
      setCurrentPage(nextPage);
      setHasNext(data.hasNext);
    } catch {
      // silently fail; user can tap again
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openEdit = (s: Supplier) => { setEditing(s); setEditForm(emptyEditForm(s)); };

  const handleSave = async () => {
    if (!editing) return;
    const balance = parseFloat(editForm.balanceOwed);
    if (isNaN(balance) || balance < 0) {
      Alert.alert('Validation', 'Balance must be a valid non-negative number');
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateSupplierPayload = {
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        balanceOwed: balance,
        notes: editForm.notes.trim() || undefined,
      };
      await supplierService.updateSupplier(editing.id, payload);
      setEditing(null);
      load();
    } catch {
      Alert.alert('Error', 'Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Validation', 'Supplier name is required');
      return;
    }
    setCreating(true);
    try {
      const payload: CreateSupplierPayload = {
        name: createForm.name.trim(),
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        balanceOwed: createForm.balanceOwed ? parseFloat(createForm.balanceOwed) : 0,
        notes: createForm.notes.trim() || undefined,
      };
      await supplierService.createSupplier(payload);
      setCreateOpen(false);
      load();
      setCreateForm({ name: '', phone: '', email: '', balanceOwed: '', notes: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create supplier';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const openViewProducts = async (s: Supplier) => {
    setViewingSupplier(s);
    setLoadingProducts(true);
    setSupplierProducts([]);
    try {
      const products = await supplierService.getSupplierProducts(s.id);
      setSupplierProducts(products);
    } catch {
      // show empty
    } finally {
      setLoadingProducts(false);
    }
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Suppliers</Text>
        <Pressable style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <SearchBar placeholder="Search suppliers..." value={search} onChangeText={setSearch} />

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={filtered.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{search ? 'No matching suppliers' : 'No suppliers yet'}</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term' : 'Add suppliers directly or via a product'}
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
          renderItem={({ item }) => {
            const owes = Number(item.balanceOwed) > 0;
            return (
              <Pressable style={styles.card} onPress={() => openEdit(item)}>
                <View style={styles.cardLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.supplierName}>{item.name}</Text>
                    {item.phone && (
                      <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.contactText}>{item.phone}</Text>
                      </View>
                    )}
                    {item.email && (
                      <View style={styles.contactRow}>
                        <Ionicons name="mail-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.contactText}>{item.email}</Text>
                      </View>
                    )}
                    <Pressable style={styles.viewProductsBtn} onPress={() => openViewProducts(item)}>
                      <Ionicons name="cube-outline" size={12} color={Colors.primary} />
                      <Text style={styles.viewProductsText}>View Products</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.balanceBadge, owes ? styles.balanceBadgeRed : styles.balanceBadgeGreen]}>
                    <Text style={[styles.balanceLabel, owes ? styles.balanceLabelRed : styles.balanceLabelGreen]}>
                      {owes ? 'Owes' : 'Paid'}
                    </Text>
                    <Text style={[styles.balanceAmount, owes ? styles.balanceLabelRed : styles.balanceLabelGreen]}>
                      Rs. {Number(item.balanceOwed).toLocaleString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 8 }} />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing?.name}</Text>
              <Pressable onPress={() => setEditing(null)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} placeholder="e.g. 9800000000" keyboardType="phone-pad"
              value={editForm.phone} onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="e.g. supplier@example.com" keyboardType="email-address"
              autoCapitalize="none" value={editForm.email} onChangeText={(v) => setEditForm((f) => ({ ...f, email: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Balance Owed (Rs.)</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad"
              value={editForm.balanceOwed} onChangeText={(v) => setEditForm((f) => ({ ...f, balanceOwed: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 72, textAlignVertical: 'top' }]} placeholder="Any notes..."
              multiline value={editForm.notes} onChangeText={(v) => setEditForm((f) => ({ ...f, notes: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Modal */}
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Supplier</Text>
              <Pressable onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. ABC Traders"
              value={createForm.name} onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} placeholder="e.g. 9800000000" keyboardType="phone-pad"
              value={createForm.phone} onChangeText={(v) => setCreateForm((f) => ({ ...f, phone: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="e.g. supplier@example.com" keyboardType="email-address"
              autoCapitalize="none" value={createForm.email} onChangeText={(v) => setCreateForm((f) => ({ ...f, email: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Balance Owed (Rs.)</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad"
              value={createForm.balanceOwed} onChangeText={(v) => setCreateForm((f) => ({ ...f, balanceOwed: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Any notes..."
              multiline value={createForm.notes} onChangeText={(v) => setCreateForm((f) => ({ ...f, notes: v }))}
              placeholderTextColor={Colors.textMuted} />
            <Pressable style={[styles.saveBtn, creating && { opacity: 0.7 }]} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.saveBtnText}>Add Supplier</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Products Modal */}
      <Modal visible={!!viewingSupplier} animationType="slide" transparent onRequestClose={() => setViewingSupplier(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Products</Text>
                <Text style={styles.modalSubtitle}>from {viewingSupplier?.name}</Text>
              </View>
              <Pressable onPress={() => setViewingSupplier(null)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>
            {loadingProducts ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
            ) : supplierProducts.length === 0 ? (
              <View style={styles.productsEmpty}>
                <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.productsEmptyText}>No products from this supplier</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {supplierProducts.map((p) => (
                  <View key={p.id} style={styles.productRow}>
                    <View style={styles.productRowInfo}>
                      <Text style={styles.productRowName}>{p.name}</Text>
                      {p.category && <Text style={styles.productRowSub}>{p.category}</Text>}
                    </View>
                    <View style={styles.productRowRight}>
                      <Text style={styles.productRowPrice}>NPR {Number(p.price).toLocaleString()}</Text>
                      <View style={[styles.qtyBadge, p.quantity === 0 && styles.qtyBadgeOut]}>
                        <Text style={[styles.qtyBadgeText, p.quantity === 0 && styles.qtyBadgeTextOut]}>
                          {p.quantity} left
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  listEmpty: { flex: 1, paddingHorizontal: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textDark },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12, marginRight: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  cardInfo: { flex: 1, gap: 3 },
  supplierName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontSize: 12, color: Colors.textMuted },
  viewProductsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  viewProductsText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end' },
  balanceBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  balanceBadgeRed: { backgroundColor: '#FEE2E2' },
  balanceBadgeGreen: { backgroundColor: '#D1FAE5' },
  balanceLabel: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  balanceAmount: { fontSize: 13, fontWeight: '700' },
  balanceLabelRed: { color: Colors.danger },
  balanceLabelGreen: { color: '#059669' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  modalSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textDark,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  productsEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  productsEmptyText: { fontSize: 14, color: Colors.textMuted },
  productRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  productRowInfo: { flex: 1, marginRight: 12 },
  productRowName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  productRowSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  productRowRight: { alignItems: 'flex-end', gap: 4 },
  productRowPrice: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  qtyBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  qtyBadgeOut: { backgroundColor: '#FEE2E2' },
  qtyBadgeText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  qtyBadgeTextOut: { color: Colors.danger },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});

