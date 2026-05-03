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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '@/components/ui/colors';
import { customersService, Customer, CreateCustomerPayload } from '@/services/customers';

type FormState = { name: string; phone: string; email: string };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', phone: '', email: '' });

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await customersService.getCustomers();
      setCustomers(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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
        const updated = await customersService.updateCustomer(editTarget.id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await customersService.createCustomer(payload as CreateCustomerPayload);
        setCustomers((prev) => [created, ...prev]);
      }
      setShowModal(false);
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
            setCustomers((prev) => prev.filter((x) => x.id !== c.id));
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
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
            filtered.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{c.name}</Text>
                  {c.phone ? <Text style={styles.sub}>{c.phone}</Text> : null}
                  {c.email ? <Text style={styles.sub}>{c.email}</Text> : null}
                </View>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseLabel}>Total</Text>
                  <Text style={styles.purchaseValue}>
                    NPR {(c.totalPurchases ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.iconBtn} onPress={() => openEdit(c)}>
                    <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                  </Pressable>
                  <Pressable style={[styles.iconBtn, styles.iconBtnDanger]} onPress={() => handleDelete(c)}>
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editTarget ? 'Save Changes' : 'Save Customer'}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textDark },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, padding: 0 },
  list: { padding: 16, paddingTop: 8, gap: 10 },
  emptyContainer: { flex: 1, paddingTop: 80 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  purchaseInfo: { alignItems: 'flex-end', flexShrink: 0 },
  purchaseLabel: { fontSize: 10, color: Colors.textMuted },
  purchaseValue: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  iconBtnDanger: { backgroundColor: Colors.dangerLight },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textMuted },
  emptySubText: { fontSize: 13, color: Colors.textMuted },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textDark },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
