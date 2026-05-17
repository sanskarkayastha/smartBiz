import {
  View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator,
  FlatList, RefreshControl, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { inventoryService, Product } from '@/services/inventory';
import { salesService, Sale } from '@/services/sales';
import { customersService, Customer } from '@/services/customers';

type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'DUE';

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

export default function Sales() {
  const [tab, setTab] = useState<'pos' | 'history'>('pos');

  // POS state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // History state
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const loadPOS = useCallback(async () => {
    try {
      const [prods, custs] = await Promise.all([
        inventoryService.getProducts(),
        customersService.getCustomers(),
      ]);
      setAllProducts(prods.filter((p) => p.quantity > 0));
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

  useFocusEffect(useCallback(() => {
    loadPOS();
    if (tab === 'history') loadHistory();
  }, [loadPOS, loadHistory, tab]));

  const searchResults = productSearch.trim()
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(productSearch.toLowerCase())
      )
    : [];

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price }];
    });
    setProductSearch('');
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const updateCartPrice = (productId: number, value: string) => {
    const parsed = parseFloat(value);
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, unitPrice: isNaN(parsed) ? i.unitPrice : parsed } : i
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setProductSearch('');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setShowCustomerDropdown(false);
  };

  const totalAmount = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const filteredCustomers = customerSearch.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : [];

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

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

      const items = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));

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
      </View>

      {tab === 'pos' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Product Search */}
            <View style={styles.searchSection}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search product by name or SKU..."
                  placeholderTextColor={Colors.textMuted}
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                {productSearch.length > 0 && (
                  <Pressable onPress={() => setProductSearch('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Search Results Dropdown */}
              {productSearch.trim().length > 0 && (
                <View style={styles.searchResults}>
                  {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ padding: 12 }} />
                  ) : searchResults.length === 0 ? (
                    <View style={styles.searchEmpty}>
                      <Text style={styles.searchEmptyText}>No products found for "{productSearch}"</Text>
                    </View>
                  ) : (
                    searchResults.map((p) => (
                      <Pressable key={p.id} style={({ pressed }) => [styles.searchResultItem, pressed && { backgroundColor: Colors.background }]} onPress={() => addToCart(p)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{p.name}</Text>
                          {p.sku && <Text style={styles.searchResultSub}>{p.sku}</Text>}
                        </View>
                        <View style={styles.searchResultRight}>
                          <Text style={styles.searchResultPrice}>Rs. {p.price.toLocaleString()}</Text>
                          <Text style={styles.searchResultStock}>{p.quantity} in stock</Text>
                        </View>
                        <Ionicons name="add-circle" size={22} color={Colors.primary} style={{ marginLeft: 8 }} />
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Cart */}
            {cart.length > 0 ? (
              <View style={styles.cartSection}>
                <Text style={styles.cartTitle}>CART ({totalItems} items)</Text>

                {cart.map((item) => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <View style={styles.cartInfo}>
                      <Text style={styles.cartName} numberOfLines={1}>{item.product.name}</Text>
                      <View style={styles.cartPriceRow}>
                        <Text style={styles.cartPriceLabel}>Price:</Text>
                        <TextInput
                          style={styles.cartPriceInput}
                          keyboardType="decimal-pad"
                          value={String(item.unitPrice)}
                          onChangeText={(v) => updateCartPrice(item.product.id, v)}
                          selectTextOnFocus
                        />
                        <Text style={styles.cartSubtotal}>
                          = Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cartControls}>
                      <Pressable
                        style={styles.stepBtn}
                        onPress={() => updateCartQty(item.product.id, -1)}
                      >
                        <Ionicons name="remove" size={14} color={Colors.textDark} />
                      </Pressable>
                      <Text style={styles.stepCount}>{item.quantity}</Text>
                      <Pressable
                        style={[styles.stepBtn, styles.stepBtnActive]}
                        onPress={() => updateCartQty(item.product.id, 1)}
                      >
                        <Ionicons name="add" size={14} color={Colors.textOnPrimary} />
                      </Pressable>
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeFromCart(item.product.id)}
                      >
                        <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                      </Pressable>
                    </View>
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
                      onChangeText={(t) => { setCustomerSearch(t); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
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

                {/* Payment method */}
                <Text style={styles.paymentLabel}>PAYMENT METHOD</Text>
                <View style={styles.paymentRow}>
                  {(['CASH', 'CARD', 'DIGITAL', 'DUE'] as PaymentMethod[]).map((method) => (
                    <Pressable
                      key={method}
                      style={({ pressed }) => [
                        styles.paymentBtn,
                        paymentMethod === method && styles.paymentBtnActive,
                        method === 'DUE' && styles.paymentBtnDue,
                        method === 'DUE' && paymentMethod === method && styles.paymentBtnDueActive,
                        pressed && { opacity: 0.78 },
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
            ) : (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyCartTitle}>Cart is empty</Text>
                <Text style={styles.emptyCartText}>Search for a product above to add it</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
            style={({ pressed }) => [styles.completeBtn, (cart.length === 0 || submitting) && styles.completeBtnDisabled, pressed && !submitting && cart.length > 0 && { opacity: 0.85 }]}
            onPress={handleCompleteSale}
            disabled={cart.length === 0 || submitting}
          >
            {submitting
              ? <ActivityIndicator color={Colors.textOnPrimary} />
              : (
                <Text style={styles.completeBtnText}>
                  {cart.length === 0
                    ? 'Add items to complete sale'
                    : `Complete Sale · NPR ${totalAmount.toLocaleString()}`}
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

  // Search
  searchSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  searchResults: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border, marginTop: 6, overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchResultName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  searchResultSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  searchResultRight: { alignItems: 'flex-end' },
  searchResultPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  searchResultStock: { fontSize: 11, color: Colors.textMuted },
  searchEmpty: { padding: 16, alignItems: 'center' },
  searchEmptyText: { fontSize: 13, color: Colors.textMuted },

  // Cart
  cartSection: {
    backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, marginTop: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  cartTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6, marginBottom: 10 },
  cartRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8,
  },
  cartInfo: { flex: 1, minWidth: 0 },
  cartName: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4 },
  cartPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartPriceLabel: { fontSize: 11, color: Colors.textMuted },
  cartPriceInput: {
    fontSize: 13, fontWeight: '600', color: Colors.primary,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
    paddingVertical: 0, paddingHorizontal: 2, minWidth: 50,
  },
  cartSubtotal: { fontSize: 11, color: Colors.textMuted },
  cartControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background,
  },
  stepBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepCount: { fontSize: 13, fontWeight: '700', color: Colors.textDark, minWidth: 20, textAlign: 'center' },
  removeBtn: {
    width: 26, height: 26, borderRadius: 7, backgroundColor: Colors.dangerLight,
    justifyContent: 'center', alignItems: 'center',
  },

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
  selectedCustomerAvatarText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: '700' },
  selectedCustomerName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textDark },
  paymentRow: { flexDirection: 'row', gap: 6 },
  paymentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.background },
  paymentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentBtnDue: { borderColor: Colors.danger },
  paymentBtnDueActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  paymentBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  paymentBtnTextActive: { color: Colors.textOnPrimary },
  dueWarning: { fontSize: 11, color: Colors.danger, marginTop: 6, fontWeight: '500' },

  // Empty cart
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyCartTitle: { fontSize: 16, fontWeight: '600', color: Colors.textDark },
  emptyCartText: { fontSize: 13, color: Colors.textMuted },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  completeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  completeBtnDisabled: { backgroundColor: Colors.textMuted },
  completeBtnText: { color: Colors.textOnPrimary, fontSize: 15, fontWeight: '700' },

  // History
  empty: { alignItems: 'center', marginTop: 40, gap: 10, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  historyList: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 100 },
  historyCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  historyDate: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  historyTime: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  historyCustomer: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  historyTotal: { alignItems: 'flex-end', gap: 4 },
  historyTotalValue: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  historyMethodBadge: { backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  historyMethodDue: { backgroundColor: '#FEE2E2', borderColor: Colors.dangerBorder },
  historyMethodText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  historyMethodDueText: { color: Colors.danger },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6 },
  historyItemName: { fontSize: 12, color: Colors.textDark, flex: 1 },
  historyItemQty: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  historyMore: { fontSize: 11, color: Colors.primary, fontWeight: '500', marginTop: 6 },
});
