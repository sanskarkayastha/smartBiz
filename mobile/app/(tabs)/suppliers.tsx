import {
  View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import SearchBar from '@/components/ui/SearchBar';
import {
  supplierService, Supplier, SupplierProduct, SupplierFilters, SupplierSummary,
  CreateSupplierPayload, UpdateSupplierPayload,
} from '@/services/suppliers';

type EditForm = { phone: string; email: string; balanceOwed: string; notes: string };
type CreateForm = { name: string; phone: string; email: string; balanceOwed: string; notes: string };
type StatusTone = 'danger' | 'warning' | 'info' | 'success';

function emptyEditForm(s: Supplier): EditForm {
  return { phone: s.phone ?? '', email: s.email ?? '', balanceOwed: String(s.balanceOwed), notes: s.notes ?? '' };
}

function formatCurrency(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function getSupplierStatus(supplier: Supplier): { label: string; tone: StatusTone; note: string } {
  if (supplier.outOfStockCount > 0) {
    return {
      label: `${supplier.outOfStockCount} out of stock`,
      tone: 'danger',
      note: `${supplier.lowStockCount + supplier.outOfStockCount} products need follow-up`,
    };
  }
  if (supplier.lowStockCount > 0) {
    return {
      label: `${supplier.lowStockCount} low stock`,
      tone: 'warning',
      note: 'Reorder soon to avoid a stockout',
    };
  }
  if (Number(supplier.balanceOwed) > 0) {
    return {
      label: 'Balance due',
      tone: 'info',
      note: `${formatCurrency(Number(supplier.balanceOwed))} still unpaid`,
    };
  }
  return {
    label: 'Well stocked',
    tone: 'success',
    note: 'No urgent supplier follow-up right now',
  };
}

function getProductStatus(product: SupplierProduct): { label: string; tone: StatusTone } {
  if (product.quantity === 0) return { label: 'Out', tone: 'danger' };
  if (product.lowStock) return { label: 'Low', tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterHasBalance, setFilterHasBalance] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [pendingHasBalance, setPendingHasBalance] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ phone: '', email: '', balanceOwed: '0', notes: '' });
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '', phone: '', email: '', balanceOwed: '', notes: '' });
  const [creating, setCreating] = useState(false);

  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const filtersRef = useRef({ search: '', hasBalance: false });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = (): SupplierFilters | undefined => {
    const { search: s, hasBalance } = filtersRef.current;
    const filters: SupplierFilters = {};
    if (s.trim()) filters.search = s.trim();
    if (hasBalance) filters.hasBalance = true;
    return Object.keys(filters).length ? filters : undefined;
  };

  const load = useCallback(async () => {
    const [suppliersResult, summaryResult] = await Promise.allSettled([
      supplierService.getSuppliers(0, 20, buildFilters()),
      supplierService.getSupplierSummary(),
    ]);

    if (suppliersResult.status === 'fulfilled') {
      setSuppliers(suppliersResult.value.content);
      setCurrentPage(0);
      setHasNext(suppliersResult.value.hasNext);
    }

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadMore = async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await supplierService.getSuppliers(nextPage, 20, buildFilters());
      setSuppliers((prev) => [...prev, ...data.content]);
      setCurrentPage(nextPage);
      setHasNext(data.hasNext);
    } catch {
      // silently fail; user can try again
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    filtersRef.current.search = text;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => load(), 400);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const data = await supplierService.getSuppliers(0, 5, { search: text });
        setSuggestions(data.content.map((s) => s.name));
      } catch {
        // ignore suggestion failure
      }
    }, 300);
  };

  const openFilterSheet = () => {
    setPendingHasBalance(filterHasBalance);
    setShowFilterSheet(true);
  };

  const applyFilters = () => {
    filtersRef.current.hasBalance = pendingHasBalance;
    setFilterHasBalance(pendingHasBalance);
    setShowFilterSheet(false);
    load();
  };

  const clearFilters = () => {
    filtersRef.current.hasBalance = false;
    setPendingHasBalance(false);
    setFilterHasBalance(false);
    setShowFilterSheet(false);
    load();
  };

  const activeFilterCount = filterHasBalance ? 1 : 0;

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setEditForm(emptyEditForm(supplier));
  };

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
      setCreateForm({ name: '', phone: '', email: '', balanceOwed: '', notes: '' });
      load();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Failed to create supplier';
      Alert.alert('Error', message);
    } finally {
      setCreating(false);
    }
  };

  const openViewProducts = async (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setLoadingProducts(true);
    setSupplierProducts([]);
    try {
      const products = await supplierService.getSupplierProducts(supplier.id);
      setSupplierProducts(products);
    } catch {
      setSupplierProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const openPhone = async (phone: string) => {
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unavailable', 'Phone calling is not supported on this device');
      return;
    }
    await Linking.openURL(url);
  };

  const openEmail = async (email: string) => {
    const url = `mailto:${email}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unavailable', 'Email is not supported on this device');
      return;
    }
    await Linking.openURL(url);
  };

  const openEditFromDetails = () => {
    if (!viewingSupplier) return;
    const supplier = viewingSupplier;
    setViewingSupplier(null);
    openEdit(supplier);
  };

  const summaryMessage = !summary || summary.totalSuppliers === 0
    ? 'Suppliers become useful when they help you spot who to reorder from and who still needs payment.'
    : summary.suppliersNeedingRestock > 0
      ? `${summary.suppliersNeedingRestock} supplier${summary.suppliersNeedingRestock === 1 ? '' : 's'} need restock follow-up across ${summary.lowStockProducts + summary.outOfStockProducts} products.`
      : summary.suppliersWithBalance > 0
        ? `Stock looks healthy. ${summary.suppliersWithBalance} supplier${summary.suppliersWithBalance === 1 ? '' : 's'} still have unpaid balances.`
        : 'All linked supplier products are stocked and no urgent supplier balances are open.';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Suppliers</Text>
          <Text style={styles.subtitle}>Restocking and follow-up in one place</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar
          placeholder="Search suppliers..."
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

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={suppliers.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Supplier desk</Text>
              <Text style={styles.summaryTitle}>Know who to reorder from next</Text>
              <Text style={styles.summaryText}>{summaryMessage}</Text>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{summary?.totalSuppliers ?? suppliers.length}</Text>
                  <Text style={styles.summaryLabel}>Suppliers</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{summary?.suppliersNeedingRestock ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Need restock</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{formatCurrency(summary?.totalBalanceOwed ?? 0)}</Text>
                  <Text style={styles.summaryLabel}>Outstanding due</Text>
                </View>
              </View>

              <View style={styles.summaryFootRow}>
                <View style={styles.summaryMiniPill}>
                  <Ionicons name="cube-outline" size={14} color={Colors.primary} />
                  <Text style={styles.summaryMiniText}>{summary?.linkedProducts ?? 0} linked products</Text>
                </View>
                <View style={styles.summaryMiniPill}>
                  <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
                  <Text style={styles.summaryMiniText}>{summary?.outOfStockProducts ?? 0} out of stock</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {search || activeFilterCount > 0 ? 'No matching suppliers' : 'No suppliers yet'}
              </Text>
              <Text style={styles.emptyText}>
                {search || activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : 'Add a supplier directly, or attach one while creating a product so you can track who to reorder from later.'}
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
            const status = getSupplierStatus(item);
            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIdentity}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.supplierName}>{item.name}</Text>
                      <Text style={styles.statusNote}>{status.note}</Text>
                    </View>
                  </View>

                  <View style={styles.cardTopActions}>
                    <View style={[styles.statusBadge, status.tone === 'danger' && styles.statusDanger, status.tone === 'warning' && styles.statusWarning, status.tone === 'info' && styles.statusInfo, status.tone === 'success' && styles.statusSuccess]}>
                      <Text style={[styles.statusBadgeText, status.tone === 'danger' && styles.statusDangerText, status.tone === 'warning' && styles.statusWarningText, status.tone === 'info' && styles.statusInfoText, status.tone === 'success' && styles.statusSuccessText]}>
                        {status.label}
                      </Text>
                    </View>
                    <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={16} color={Colors.textDark} />
                    </Pressable>
                  </View>
                </View>

                {(item.phone || item.email || item.notes) && (
                  <View style={styles.metaBlock}>
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
                    {item.notes && <Text style={styles.noteText} numberOfLines={2}>{item.notes}</Text>}
                  </View>
                )}

                <View style={styles.metricWrap}>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricChipValue}>{item.productCount}</Text>
                    <Text style={styles.metricChipLabel}>products</Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricChipValue}>{item.totalUnits}</Text>
                    <Text style={styles.metricChipLabel}>units on hand</Text>
                  </View>
                  <View style={[styles.metricChip, item.lowStockCount > 0 && styles.metricChipWarning]}>
                    <Text style={[styles.metricChipValue, item.lowStockCount > 0 && styles.metricChipWarningText]}>{item.lowStockCount}</Text>
                    <Text style={[styles.metricChipLabel, item.lowStockCount > 0 && styles.metricChipWarningText]}>low stock</Text>
                  </View>
                  <View style={[styles.metricChip, item.outOfStockCount > 0 && styles.metricChipDanger]}>
                    <Text style={[styles.metricChipValue, item.outOfStockCount > 0 && styles.metricChipDangerText]}>{item.outOfStockCount}</Text>
                    <Text style={[styles.metricChipLabel, item.outOfStockCount > 0 && styles.metricChipDangerText]}>out</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.primaryAction} onPress={() => openViewProducts(item)}>
                    <Ionicons name="cube-outline" size={15} color={Colors.textOnPrimary} />
                    <Text style={styles.primaryActionText}>View Products</Text>
                  </Pressable>

                  {item.phone ? (
                    <Pressable style={styles.secondaryAction} onPress={() => openPhone(item.phone!)}>
                      <Ionicons name="call-outline" size={15} color={Colors.primary} />
                      <Text style={styles.secondaryActionText}>Call</Text>
                    </Pressable>
                  ) : item.email ? (
                    <Pressable style={styles.secondaryAction} onPress={() => openEmail(item.email!)}>
                      <Ionicons name="mail-outline" size={15} color={Colors.primary} />
                      <Text style={styles.secondaryActionText}>Email</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.secondaryAction} onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={15} color={Colors.primary} />
                      <Text style={styles.secondaryActionText}>Add Details</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

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
            <TextInput
              style={styles.input}
              placeholder="e.g. 9800000000"
              keyboardType="phone-pad"
              value={editForm.phone}
              onChangeText={(value) => setEditForm((form) => ({ ...form, phone: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. supplier@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={editForm.email}
              onChangeText={(value) => setEditForm((form) => ({ ...form, email: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Balance Owed (Rs.)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="decimal-pad"
              value={editForm.balanceOwed}
              onChangeText={(value) => setEditForm((form) => ({ ...form, balanceOwed: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any notes..."
              multiline
              value={editForm.notes}
              onChangeText={(value) => setEditForm((form) => ({ ...form, notes: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Pressable style={[styles.saveBtn, saving && styles.disabledBtn]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
            <TextInput
              style={styles.input}
              placeholder="e.g. ABC Traders"
              value={createForm.name}
              onChangeText={(value) => setCreateForm((form) => ({ ...form, name: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9800000000"
              keyboardType="phone-pad"
              value={createForm.phone}
              onChangeText={(value) => setCreateForm((form) => ({ ...form, phone: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. supplier@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={createForm.email}
              onChangeText={(value) => setCreateForm((form) => ({ ...form, email: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Balance Owed (Rs.)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="decimal-pad"
              value={createForm.balanceOwed}
              onChangeText={(value) => setCreateForm((form) => ({ ...form, balanceOwed: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.smallTextArea]}
              placeholder="Any notes..."
              multiline
              value={createForm.notes}
              onChangeText={(value) => setCreateForm((form) => ({ ...form, notes: value }))}
              placeholderTextColor={Colors.textMuted}
            />
            <Pressable style={[styles.saveBtn, creating && styles.disabledBtn]} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.saveBtnText}>Add Supplier</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!viewingSupplier} animationType="slide" transparent onRequestClose={() => setViewingSupplier(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.detailSheet]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{viewingSupplier?.name}</Text>
                <Text style={styles.modalSubtitle}>Supplier overview</Text>
              </View>
              <Pressable onPress={() => setViewingSupplier(null)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            {viewingSupplier && (
              <View style={styles.detailHero}>
                <View style={styles.metricWrap}>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricChipValue}>{viewingSupplier.productCount}</Text>
                    <Text style={styles.metricChipLabel}>products</Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricChipValue}>{formatCurrency(Number(viewingSupplier.balanceOwed))}</Text>
                    <Text style={styles.metricChipLabel}>balance due</Text>
                  </View>
                  <View style={[styles.metricChip, viewingSupplier.lowStockCount > 0 && styles.metricChipWarning]}>
                    <Text style={[styles.metricChipValue, viewingSupplier.lowStockCount > 0 && styles.metricChipWarningText]}>{viewingSupplier.lowStockCount}</Text>
                    <Text style={[styles.metricChipLabel, viewingSupplier.lowStockCount > 0 && styles.metricChipWarningText]}>low stock</Text>
                  </View>
                  <View style={[styles.metricChip, viewingSupplier.outOfStockCount > 0 && styles.metricChipDanger]}>
                    <Text style={[styles.metricChipValue, viewingSupplier.outOfStockCount > 0 && styles.metricChipDangerText]}>{viewingSupplier.outOfStockCount}</Text>
                    <Text style={[styles.metricChipLabel, viewingSupplier.outOfStockCount > 0 && styles.metricChipDangerText]}>out</Text>
                  </View>
                </View>

                <View style={styles.quickActionRow}>
                  {viewingSupplier.phone && (
                    <Pressable style={styles.quickActionBtn} onPress={() => openPhone(viewingSupplier.phone!)}>
                      <Ionicons name="call-outline" size={16} color={Colors.primary} />
                      <Text style={styles.quickActionText}>Call</Text>
                    </Pressable>
                  )}
                  {viewingSupplier.email && (
                    <Pressable style={styles.quickActionBtn} onPress={() => openEmail(viewingSupplier.email!)}>
                      <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                      <Text style={styles.quickActionText}>Email</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.quickActionBtn} onPress={openEditFromDetails}>
                    <Ionicons name="create-outline" size={16} color={Colors.primary} />
                    <Text style={styles.quickActionText}>Edit</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Products from this supplier</Text>
            {loadingProducts ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
            ) : supplierProducts.length === 0 ? (
              <View style={styles.productsEmpty}>
                <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.productsEmptyText}>No products from this supplier yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {supplierProducts.map((product) => {
                  const status = getProductStatus(product);
                  return (
                    <View key={product.id} style={styles.productRow}>
                      <View style={styles.productRowInfo}>
                        <Text style={styles.productRowName}>{product.name}</Text>
                        <Text style={styles.productRowSub}>
                          {product.category ?? 'Uncategorized'}
                          {product.reorderLevel != null ? ` | Reorder at ${product.reorderLevel}` : ''}
                        </Text>
                      </View>
                      <View style={styles.productRowRight}>
                        <Text style={styles.productRowPrice}>NPR {Number(product.price).toLocaleString()}</Text>
                        <View style={[styles.productStatus, status.tone === 'danger' && styles.statusDanger, status.tone === 'warning' && styles.statusWarning, status.tone === 'success' && styles.statusSuccess]}>
                          <Text style={[styles.productStatusText, status.tone === 'danger' && styles.statusDangerText, status.tone === 'warning' && styles.statusWarningText, status.tone === 'success' && styles.statusSuccessText]}>
                            {status.label} - {product.quantity} left
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterSheet} animationType="slide" transparent onRequestClose={() => setShowFilterSheet(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.filterSheet]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Suppliers</Text>
              <Pressable onPress={() => setShowFilterSheet(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            <Pressable
              style={[styles.toggleRow, pendingHasBalance && styles.toggleRowActive]}
              onPress={() => setPendingHasBalance((value) => !value)}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Has Outstanding Balance</Text>
                <Text style={styles.toggleSub}>Only show suppliers you still need to pay</Text>
              </View>
              <View style={[styles.toggleKnob, pendingHasBalance && styles.toggleKnobActive]}>
                <Ionicons name={pendingHasBalance ? 'checkmark' : 'close'} size={14} color={pendingHasBalance ? Colors.textOnPrimary : Colors.textMuted} />
              </View>
            </Pressable>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textDark },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  searchWrapper: { zIndex: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  listEmpty: { flex: 1, paddingHorizontal: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark, marginTop: 6 },
  summaryText: { fontSize: 13, lineHeight: 19, color: Colors.textMuted, marginTop: 8 },
  summaryGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  summaryTile: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 12,
    minHeight: 84,
    justifyContent: 'space-between',
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  summaryLabel: { fontSize: 12, color: Colors.textMuted },
  summaryFootRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  summaryMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
  },
  summaryMiniText: { fontSize: 12, fontWeight: '600', color: Colors.textDark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 18 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 12,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  cardInfo: { flex: 1 },
  supplierName: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  statusNote: { fontSize: 12, color: Colors.textMuted, marginTop: 3, lineHeight: 17 },
  cardTopActions: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.successLight },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusDanger: { backgroundColor: Colors.dangerLight },
  statusDangerText: { color: Colors.danger },
  statusWarning: { backgroundColor: Colors.warningLight },
  statusWarningText: { color: Colors.warning },
  statusInfo: { backgroundColor: Colors.primaryLight },
  statusInfoText: { color: Colors.primary },
  statusSuccess: { backgroundColor: Colors.successLight },
  statusSuccessText: { color: Colors.success },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  metaBlock: { gap: 5 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactText: { fontSize: 12, color: Colors.textMuted },
  noteText: { fontSize: 12, color: Colors.textDark, lineHeight: 17 },
  metricWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricChip: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.background,
    minWidth: 76,
  },
  metricChipValue: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  metricChipLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  metricChipWarning: { backgroundColor: Colors.warningLight },
  metricChipWarningText: { color: Colors.warning },
  metricChipDanger: { backgroundColor: Colors.dangerLight },
  metricChipDangerText: { color: Colors.danger },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryActionText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  secondaryAction: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  secondaryActionText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.32)' },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  detailSheet: { maxHeight: '76%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  modalSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  detailHero: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  quickActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textDark,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  smallTextArea: { height: 68, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '800', fontSize: 15 },
  disabledBtn: { opacity: 0.7 },
  productsEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  productsEmptyText: { fontSize: 14, color: Colors.textMuted },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  productRowInfo: { flex: 1 },
  productRowName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  productRowSub: { fontSize: 11, color: Colors.textMuted, marginTop: 3, lineHeight: 16 },
  productRowRight: { alignItems: 'flex-end', gap: 6 },
  productRowPrice: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  productStatus: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  productStatusText: { fontSize: 11, fontWeight: '700' },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 18 },
  loadMoreText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  filterSheet: { paddingBottom: 36 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  toggleRowActive: { borderColor: Colors.primaryBorder, backgroundColor: Colors.primaryLight },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  toggleSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleKnobActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBtnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },
  suggestOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  suggestItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  suggestText: { fontSize: 14, color: Colors.textDark },
});
