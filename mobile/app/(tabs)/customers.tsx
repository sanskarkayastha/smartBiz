import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '@/components/ui/colors';
import { customersService, Customer, CreateCustomerPayload } from '@/services/customers';
import { salesService, Sale } from '@/services/sales';

type FormState = { name: string; phone: string; email: string };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', phone: '', email: '' });

  const [showHistory, setShowHistory] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await customersService.getCustomers(0, 20);
      setCustomers(data.content);
      setCurrentPage(0);
      setHasNext(data.hasNext);
    } catch {
      setError(true);
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
      const data = await customersService.getCustomers(nextPage, 20);
      setCustomers((prev) => [...prev, ...data.content]);
      setCurrentPage(nextPage);
      setHasNext(data.hasNext);
    } catch {
      // silently fail; user can tap again
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', email: '' });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '' });
    setShowModal(true);
  };

  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const all = await salesService.getSales();
      setPurchases(all.filter((s) => s.customerId === c.id));
    } catch {
      setPurchases([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Customer name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CreateCustomerPayload> = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      };
      if (editTarget) {
        await customersService.updateCustomer(editTarget.id, payload);
      } else {
        await customersService.createCustomer(payload as CreateCustomerPayload);
      }
      setShowModal(false);
      load();
    } catch {
      Alert.alert('Error', `Failed to ${editTarget ? 'update' : 'create'} customer.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: Customer) => {
    Alert.alert('Delete Customer', `Remove "${c.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await customersService.deleteCustomer(c.id);
            if (expandedId === c.id) setExpandedId(null);
            load();
          } catch {
            Alert.alert('Error', 'Failed to delete customer.');
          }
        },
      },
    ]);
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Failed to load customers</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {search ? `No results for "${search}"` : 'No customers yet'}
              </Text>
              {!search && <Text style={styles.emptySubText}>Add your first customer to get started</Text>}
            </View>
          ) : (
            filtered.map((c) => {
              const isExpanded = expandedId === c.id;
              const contactLine = [c.phone, c.email].filter(Boolean).join(' · ');
              return (
                <View key={c.id} style={[styles.card, isExpanded && styles.cardExpanded]}>
                  <Pressable
                    style={({ pressed }) => [styles.cardHeader, pressed && { opacity: 0.82 }]}
                    onPress={() => toggleExpand(c.id)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.name}>{c.name}</Text>
                      {contactLine ? (
                        <Text style={styles.sub} numberOfLines={1}>{contactLine}</Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.divider} />

                      <View style={styles.detailsGrid}>
                        {c.phone ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone</Text>
                            <Text style={styles.detailValue}>{c.phone}</Text>
                          </View>
                        ) : null}
                        {c.email ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Email</Text>
                            <Text style={styles.detailValue}>{c.email}</Text>
                          </View>
                        ) : null}
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Total Purchases</Text>
                          <Text style={[styles.detailValue, styles.detailValueBold]}>
                            NPR {(c.totalPurchases ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        {c.lastPurchaseDate ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Last Visit</Text>
                            <Text style={styles.detailValue}>{formatDate(c.lastPurchaseDate)}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.actionRow}>
                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
                          onPress={() => openEdit(c)}
                        >
                          <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                          <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, styles.actionBtnHistory, pressed && { opacity: 0.75 }]}
                          onPress={() => openHistory(c)}
                        >
                          <Ionicons name="receipt-outline" size={15} color={Colors.primary} />
                          <Text style={[styles.actionBtnText, { color: Colors.primary }]}>History</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && { opacity: 0.75 }]}
                          onPress={() => handleDelete(c)}
                        >
                          <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                          <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
          {hasNext && (
            <Pressable style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore
                ? <ActivityIndicator color={Colors.primary} size="small" />
                : <Text style={styles.loadMoreText}>Load More</Text>}
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Customer' : 'New Customer'}</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 98XXXXXXXX"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="customer@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>{editTarget ? 'Save Changes' : 'Save Customer'}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Purchase History Modal */}
      <Modal visible={showHistory} animationType="slide" transparent onRequestClose={() => setShowHistory(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.historySheet]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Purchase History</Text>
                {historyCustomer && (
                  <Text style={styles.historySubtitle}>{historyCustomer.name}</Text>
                )}
              </View>
              <Pressable onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            {loadingHistory ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
            ) : purchases.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No purchases yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.historyList}>
                {purchases.map((s) => (
                  <View key={s.id} style={styles.historyItem}>
                    <View style={styles.historyItemTop}>
                      <Text style={styles.historyDate}>{formatDate(s.saleDate)}</Text>
                      <Text style={styles.historyAmount}>NPR {s.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.historyItemBottom}>
                      <Text style={styles.historyMeta} numberOfLines={1}>
                        {s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                      </Text>
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>{s.paymentMethod}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textDark },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: Colors.textOnPrimary, fontWeight: '600', fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, padding: 0 },
  list: { padding: 16, paddingTop: 8, gap: 10 },
  emptyContainer: { flex: 1, paddingTop: 80 },

  // Card
  card: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardExpanded: { borderColor: Colors.primary + '50' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  cardHeaderInfo: { flex: 1, minWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Expanded section
  expandedSection: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  detailsGrid: { gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, color: Colors.textMuted },
  detailValue: { fontSize: 13, color: Colors.textDark },
  detailValueBold: { fontWeight: '600' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.primary + '12', borderWidth: 1, borderColor: Colors.primary + '30' },
  actionBtnHistory: { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '30' },
  actionBtnDanger: { backgroundColor: Colors.dangerLight, borderColor: Colors.danger + '30' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // Shared empty/error
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textMuted },
  emptySubText: { fontSize: 13, color: Colors.textMuted },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  retryText: { color: Colors.textOnPrimary, fontWeight: '600' },

  // Add/Edit modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textDark },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },

  // History modal
  historySheet: { maxHeight: '80%' },
  historySubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  historyEmpty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  historyList: { marginTop: 4 },
  historyItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyItemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  historyAmount: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  historyMeta: { fontSize: 12, color: Colors.textMuted, flex: 1, marginRight: 8 },
  historyBadge: { backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  historyBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});
