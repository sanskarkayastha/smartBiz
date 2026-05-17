import {
  View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator,
  FlatList, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import SearchBar from '@/components/ui/SearchBar';
import { inventoryService, Product } from '@/services/inventory';
import { salesService, Sale } from '@/services/sales';
import { customersService, Customer } from '@/services/customers';

type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'DUE';

const PLACEHOLDER_COLORS = ['#FEF3C7', '#DCFCE7', '#FEE2E2', '#F3E8FF'];

export default function Sales() {
  const [tab, setTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadPOS = useCallback(async () => {
    try {
      const [prods, custs] = await Promise.all([
        inventoryService.getProducts(),
        customersService.getCustomers(),
      ]);
      setProducts(prods.filter((p) => p.quantity > 0));
      setCustomers(custs);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (isPullRefresh = false) => {
    if (!isPullRefresh) setLoadingHistory(true);
    try {
      const data = await salesService.getSales();
      setSales(data);
    } catch {}
    finally { setLoadingHistory(false); setRefreshingHistory(false); }
  }, []);

  useEffect(() => { loadPOS(); }, [loadPOS]);

  useFocusEffect(useCallback(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]));

  const updateQty = (id: number, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const clearCart = () => {
    setQuantities({});
    setCustomerSearch('');
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setShowDropdown(false);
  };

  const cartItems = products.filter((p) => (quantities[p.id] ?? 0) > 0);
  const totalItems = cartItems.reduce((s, p) => s + (quantities[p.id] ?? 0), 0);
  const totalAmount = cartItems.reduce((s, p) => s + p.price * (quantities[p.id] ?? 0), 0);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customerSearch.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : [];

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setShowDropdown(false);
  };

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;

    const resolvedName = selectedCustomer?.name ?? (customerSearch.trim() || undefined);
    if (paymentMethod === 'DUE' && !resolvedName) {
      Alert.alert('Customer Required', 'Please select or enter a customer name for DUE payment');
      return;
    }

    setSubmitting(true);
    try {
      let customerId = selectedCustomer?.id;
      let customerName = resolvedName;

      if (customerSearch.trim() && !selectedCustomer) {
        const newCustomer = await customersService.createCustomer({ name: customerSearch.trim() });
        customerId = newCustomer.id;
        customerName = newCustomer.name;
      }

      const items = cartItems.map((p) => ({ productId: p.id, quantity: quantities[p.id] }));
      await salesService.createSale(items, paymentMethod, customerId, customerName);

      const customerMsg = customerName ? ` · ${customerName}` : '';
      const dueMsg = paymentMethod === 'DUE' ? '\nRecorded as due — customer owes this amount.' : '';
      Alert.alert(
        'Sale Recorded!',
        `Total: NPR ${totalAmount.toLocaleString()} · ${paymentMethod}${customerMsg}${dueMsg}`,
        [{ text: 'OK', onPress: clearCart }],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        'Failed to record sale. Please try again.';
      Alert.alert('Sale Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.stickyTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Sales</Text>
        </View>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'pos' && styles.tabActive]} onPress={() => setTab('pos')}>
            <Text style={[styles.tabText, tab === 'pos' && styles.tabTextActive]}>POS</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => { setTab('history'); loadHistory(); }}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
          </Pressable>
        </View>
        {tab === 'pos' && (
          <SearchBar placeholder="Search products..." value={search} onChangeText={setSearch} />
        )}
      </View>

      {tab === 'pos' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>PRODUCTS</Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : filteredProducts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {search ? `No products matching "${search}"` : 'No products in stock'}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredProducts.map((product, index) => {
                const qty = quantities[product.id] ?? 0;
                return (
                  <View key={product.id} style={styles.productCard}>
                    <View style={[styles.productImage, { backgroundColor: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length] }]}>
                      <Text style={styles.priceOverlay}>NPR {product.price}</Text>
                    </View>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <View style={styles.stepper}>
                      <Pressable
                        style={[styles.stepBtn, qty === 0 && styles.stepBtnDisabled]}
                        onPress={() => updateQty(product.id, -1)}
                        disabled={qty === 0}
                      >
                        <Ionicons name="remove" size={16} color={qty === 0 ? Colors.textMuted : Colors.textDark} />
                      </Pressable>
                      <Text style={styles.stepCount}>{qty}</Text>
                      <Pressable style={[styles.stepBtn, styles.stepBtnActive]} onPress={() => updateQty(product.id, 1)}>
                        <Ionicons name="add" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {cartItems.length > 0 && (
            <View style={styles.cartSection}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartTitle}>CART ({totalItems} items)</Text>
              </View>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  <Text style={styles.cartQty}>{quantities[item.id]}×</Text>
                  <Text style={styles.cartName}>{item.name}</Text>
                  <Text style={styles.cartPrice}>NPR {(item.price * (quantities[item.id] ?? 0)).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>NPR {totalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />

              {/* Customer */}
              <Text style={styles.paymentLabel}>CUSTOMER (OPTIONAL)</Text>
              {selectedCustomer ? (
                <View style={styles.selectedCustomerRow}>
                  <View style={styles.selectedCustomerAvatar}>
                    <Text style={styles.selectedCustomerAvatarText}>
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.selectedCustomerName} numberOfLines={1}>{selectedCustomer.name}</Text>
                  <Pressable onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <View>
                  <TextInput
                    style={styles.customerInput}
                    placeholder="Search or enter customer name..."
                    placeholderTextColor={Colors.textMuted}
                    value={customerSearch}
                    onChangeText={(t) => { setCustomerSearch(t); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {showDropdown && filteredCustomers.length > 0 && (
                    <View style={styles.dropdown}>
                      {filteredCustomers.slice(0, 4).map((c) => (
                        <Pressable key={c.id} style={styles.dropdownItem} onPress={() => handleSelectCustomer(c)}>
                          <Text style={styles.dropdownName}>{c.name}</Text>
                          {c.phone && <Text style={styles.dropdownSub}>{c.phone}</Text>}
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {customerSearch.trim() && filteredCustomers.length === 0 && (
                    <Text style={styles.newCustomerHint}>
                      New customer will be created: "{customerSearch.trim()}"
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.divider} />
              <Text style={styles.paymentLabel}>PAYMENT METHOD</Text>
              <View style={styles.paymentRow}>
                {(['CASH', 'CARD', 'DIGITAL', 'DUE'] as PaymentMethod[]).map((method) => (
                  <Pressable
                    key={method}
                    style={[
                      styles.paymentBtn,
                      paymentMethod === method && styles.paymentBtnActive,
                      method === 'DUE' && styles.paymentBtnDue,
                      method === 'DUE' && paymentMethod === method && styles.paymentBtnDueActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[
                      styles.paymentBtnText,
                      paymentMethod === method && styles.paymentBtnTextActive,
                    ]}>
                      {method}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {paymentMethod === 'DUE' && !selectedCustomer && !customerSearch.trim() && (
                <Text style={styles.dueWarning}>
                  ⚠ Select or enter a customer to use DUE payment
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={() => { setRefreshingHistory(true); loadHistory(true); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            loadingHistory ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No sales recorded yet</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyDate}>{new Date(item.saleDate).toLocaleDateString()}</Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {item.customerName && (
                    <Text style={styles.historyCustomer}>
                      <Ionicons name="person-outline" size={11} /> {item.customerName}
                    </Text>
                  )}
                </View>
                <View style={styles.historyTotal}>
                  <Text style={styles.historyTotalValue}>NPR {item.totalAmount.toLocaleString()}</Text>
                  <View style={[
                    styles.historyMethodBadge,
                    item.paymentMethod === 'DUE' && styles.historyMethodDue,
                  ]}>
                    <Text style={[
                      styles.historyMethodText,
                      item.paymentMethod === 'DUE' && styles.historyMethodDueText,
                    ]}>
                      {item.paymentMethod}
                    </Text>
                  </View>
                </View>
              </View>
              {item.items?.slice(0, 2).map((it, idx) => (
                <View key={idx} style={styles.historyItem}>
                  <Text style={styles.historyItemName} numberOfLines={1}>{it.productName}</Text>
                  <Text style={styles.historyItemQty}>{it.quantity}× NPR {it.unitPrice}</Text>
                </View>
              ))}
              {(item.items?.length ?? 0) > 2 && (
                <Text style={styles.historyMore}>+{(item.items?.length ?? 0) - 2} more items</Text>
              )}
            </View>
          )}
        />
      )}

      {tab === 'pos' && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.completeBtn, (cartItems.length === 0 || submitting) && styles.completeBtnDisabled]}
            onPress={handleCompleteSale}
            disabled={cartItems.length === 0 || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : (
                <Text style={styles.completeBtnText}>
                  {cartItems.length === 0 ? 'Add items to complete sale' : `Complete Sale · NPR ${totalAmount.toLocaleString()}`}
                </Text>
              )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  stickyTop: { backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: Colors.border },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  scroll: { paddingBottom: 100 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 10 },
  empty: { alignItems: 'center', marginTop: 40, gap: 10, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  productCard: { width: '47%', backgroundColor: Colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  productImage: { height: 100, justifyContent: 'flex-end', padding: 8 },
  priceOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  productName: { fontSize: 13, fontWeight: '600', color: Colors.textDark, padding: 8, paddingBottom: 4, minHeight: 44 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 10 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  stepBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepBtnDisabled: { opacity: 0.4 },
  stepCount: { fontSize: 15, fontWeight: '700', color: Colors.textDark, minWidth: 24, textAlign: 'center' },
  cartSection: { backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  cartHeader: { marginBottom: 10 },
  cartTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  cartQty: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, width: 28 },
  cartName: { flex: 1, fontSize: 13, color: Colors.textDark },
  cartPrice: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: Colors.textMuted },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.textDark },
  paymentLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6, marginBottom: 8 },
  customerInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, color: Colors.textDark, marginBottom: 4,
  },
  dropdown: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, overflow: 'hidden', marginBottom: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dropdownName: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  dropdownSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  newCustomerHint: { fontSize: 11, color: Colors.primary, fontStyle: 'italic', marginBottom: 4 },
  selectedCustomerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary + '15', borderRadius: 10, padding: 9, marginBottom: 4,
  },
  selectedCustomerAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  selectedCustomerAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  selectedCustomerName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textDark },
  paymentRow: { flexDirection: 'row', gap: 6 },
  paymentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.background },
  paymentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentBtnDue: { borderColor: '#DC2626' },
  paymentBtnDueActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  paymentBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  paymentBtnTextActive: { color: '#fff' },
  dueWarning: { fontSize: 11, color: '#DC2626', marginTop: 6, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  completeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  completeBtnDisabled: { backgroundColor: Colors.textMuted },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  historyList: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 100 },
  historyCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  historyDate: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  historyTime: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  historyCustomer: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  historyTotal: { alignItems: 'flex-end', gap: 4 },
  historyTotalValue: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  historyMethodBadge: { backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  historyMethodDue: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  historyMethodText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  historyMethodDueText: { color: '#DC2626' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6 },
  historyItemName: { fontSize: 12, color: Colors.textDark, flex: 1 },
  historyItemQty: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  historyMore: { fontSize: 11, color: Colors.primary, fontWeight: '500', marginTop: 6 },
});
