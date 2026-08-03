import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import ImportSalesModal from '@/components/ui/ImportSalesModal';
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal';
import { inventoryService, type Product } from '@/services/inventory';
import { salesService, type Sale } from '@/services/sales';
import { customersService, type Customer } from '@/services/customers';
import { consumeCompletedPosPayment } from '@/services/paymentEvents';

type PaymentMethod = 'CASH' | 'CARD' | 'ESEWA' | 'DUE';

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

function normalizeSaleDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : null;
}

function hasInvalidSalePrice(cart: CartItem[]) {
  return cart.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0);
}

export default function Sales() {
  const router = useRouter();
  const [tab, setTab] = useState<'pos' | 'history'>('pos');

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [saleDateInput, setSaleDateInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const availableProducts = allProducts.filter((product) => product.quantity > 0);

  const loadPOS = useCallback(async () => {
    setLoading(true);
    try {
      const [productsResponse, customersResponse] = await Promise.all([
        inventoryService.getProducts(0, 1000),
        customersService.getCustomers(0, 1000),
      ]);

      setAllProducts(productsResponse.content);
      setCustomers(customersResponse.content);
    } catch {
      Alert.alert('Loading Failed', 'Could not load products and customers right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (isPullRefresh = false) => {
    if (!isPullRefresh) setLoadingHistory(true);
    try {
      const data = await salesService.getSales();
      setSales(data);
    } catch {
      if (!isPullRefresh) {
        Alert.alert('Loading Failed', 'Could not load sales history right now.');
      }
    } finally {
      setLoadingHistory(false);
      setRefreshingHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPOS();
      if (tab === 'history') {
        void loadHistory();
      }
    }, [loadPOS, loadHistory, tab]),
  );

  useFocusEffect(useCallback(() => {
    if (consumeCompletedPosPayment()) {
      setCart([]); setProductSearch(''); setCustomerSearch(''); setSelectedCustomer(null);
      setPaymentMethod('CASH'); setSaleDateInput(''); setShowCustomerDropdown(false);
      void loadPOS(); void loadHistory();
    }
  }, [loadPOS, loadHistory]));

  const searchResults = productSearch.trim()
    ? availableProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          product.sku?.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : [];

  const filteredCustomers = customerSearch.trim()
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.phone?.includes(customerSearch),
      )
    : [];

  const totalAmount = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...prev, { product, quantity: 1, unitPrice: product.price }];
    });
    setProductSearch('');
    Keyboard.dismiss();
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const updateCartPrice = (productId: number, value: string) => {
    const parsed = parseFloat(value);
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, unitPrice: Number.isNaN(parsed) ? item.unitPrice : parsed }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setProductSearch('');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setSaleDateInput('');
    setShowCustomerDropdown(false);
  };

  const handleBarcodeLookup = async (code: string) => {
    setShowBarcodeScanner(false);
    try {
      const product = await inventoryService.getProductByBarcode(code);
      setScannedProduct(product);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        Alert.alert('Product Not Found', 'No inventory product is linked to that code yet.');
        return;
      }

      Alert.alert('Scan Failed', 'Could not look up that code right now.');
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleCompleteSale = async () => {
    if (!cart.length) return;

    const typedCustomerName = customerSearch.trim() || undefined;
    const resolvedName = selectedCustomer?.name ?? typedCustomerName;
    if (paymentMethod === 'DUE' && !resolvedName) {
      Alert.alert('Customer Required', 'Please select or enter a customer name for DUE payment.');
      return;
    }

    const normalizedSaleDate = normalizeSaleDate(saleDateInput);
    if (saleDateInput.trim() && !normalizedSaleDate) {
      Alert.alert('Invalid Date', 'Use YYYY-MM-DD for the sale date.');
      return;
    }

    if (hasInvalidSalePrice(cart)) {
      Alert.alert('Invalid Price', 'Each sale item needs a sale price greater than 0.');
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

      const saleItems = cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
      }));

      if (paymentMethod === 'ESEWA') {
        const payment = await salesService.createEsewaPayment({
          items: saleItems, paymentMethod: 'ESEWA', customerId, customerName, saleDate: normalizedSaleDate,
        });
        router.push({ pathname: '/esewa-payment', params: { paymentId: payment.paymentId, amount: String(payment.amount) } });
        return;
      }

      await salesService.createSale(saleItems, paymentMethod, customerId, customerName, normalizedSaleDate);

      await Promise.all([loadPOS(), loadHistory()]);

      const customerMsg = customerName ? ` | ${customerName}` : '';
      const dateMsg = saleDateInput.trim() ? `\nDate: ${saleDateInput.trim()}` : '';
      const dueMsg =
        paymentMethod === 'DUE'
          ? '\nRecorded as due. Customer owes this amount.'
          : '';

      Alert.alert(
        'Sale Recorded',
        `Total: NPR ${totalAmount.toLocaleString()} | ${paymentMethod}${customerMsg}${dateMsg}${dueMsg}`,
        [{ text: 'OK', onPress: clearCart }],
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        'Failed to record sale. Please try again.';
      Alert.alert('Sale Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: Sale }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyDate}>{new Date(item.saleDate).toLocaleDateString()}</Text>
          <Text style={styles.historyTime}>
            {new Date(item.saleDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {item.customerName ? (
            <Text style={styles.historyCustomer}>
              <Ionicons name="person-outline" size={11} /> {item.customerName}
            </Text>
          ) : null}
        </View>
        <View style={styles.historyTotal}>
          <Text style={styles.historyTotalValue}>NPR {item.totalAmount.toLocaleString()}</Text>
          <View
            style={[
              styles.historyMethodBadge,
              item.paymentMethod === 'DUE' && styles.historyMethodDue,
            ]}
          >
            <Text
              style={[
                styles.historyMethodText,
                item.paymentMethod === 'DUE' && styles.historyMethodDueText,
              ]}
            >
              {item.paymentMethod}
            </Text>
          </View>
        </View>
      </View>

      {item.items?.slice(0, 2).map((saleItem, index) => (
        <View key={index} style={styles.historyItem}>
          <Text style={styles.historyItemName} numberOfLines={1}>
            {saleItem.productName}
          </Text>
          <Text style={styles.historyItemQty}>
            {saleItem.quantity}x NPR {saleItem.unitPrice}
          </Text>
        </View>
      ))}

      {(item.items?.length ?? 0) > 2 ? (
        <Text style={styles.historyMore}>+{(item.items?.length ?? 0) - 2} more items</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.stickyTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Sales</Text>
          <Pressable
            style={({ pressed }) => [styles.importBtn, pressed && { opacity: 0.82 }]}
            onPress={() => setShowImportModal(true)}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
            <Text style={styles.importBtnText}>Import</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'pos' && styles.tabActive]}
            onPress={() => setTab('pos')}
          >
            <Text style={[styles.tabText, tab === 'pos' && styles.tabTextActive]}>POS</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => {
              setTab('history');
              void loadHistory();
            }}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </Pressable>
        </View>
      </View>

      {tab === 'pos' ? (
        <KeyboardAvoidingView
          style={styles.posLayout}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.posScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.searchSection}>
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={Colors.textMuted}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search product by name or SKU..."
                    placeholderTextColor={Colors.textMuted}
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                  {productSearch.length > 0 ? (
                    <Pressable onPress={() => setProductSearch('')}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.82 }]}
                  onPress={() => setShowBarcodeScanner(true)}
                >
                  <Ionicons name="scan-outline" size={20} color={Colors.textOnPrimary} />
                </Pressable>
              </View>

              {productSearch.trim().length > 0 ? (
                <View style={styles.searchResults}>
                  {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ padding: 12 }} />
                  ) : searchResults.length === 0 ? (
                    <View style={styles.searchEmpty}>
                      <Text style={styles.searchEmptyText}>
                        No products found for {`"${productSearch}"`}
                      </Text>
                    </View>
                  ) : (
                    searchResults.map((product) => (
                      <Pressable
                        key={product.id}
                        style={({ pressed }) => [
                          styles.searchResultItem,
                          pressed && { backgroundColor: Colors.background },
                        ]}
                        onPress={() => addToCart(product)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{product.name}</Text>
                          {product.sku ? (
                            <Text style={styles.searchResultSub}>{product.sku}</Text>
                          ) : null}
                        </View>
                        <View style={styles.searchResultRight}>
                          <Text style={styles.searchResultPrice}>
                            Rs. {product.price.toLocaleString()}
                          </Text>
                          <Text style={styles.searchResultStock}>
                            {product.quantity} in stock
                          </Text>
                        </View>
                        <Ionicons
                          name="add-circle"
                          size={22}
                          color={Colors.primary}
                          style={{ marginLeft: 8 }}
                        />
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </View>

            {cart.length > 0 ? (
              <View style={styles.cartSection}>
                <Text style={styles.cartTitle}>CART ({totalItems} items)</Text>

                {cart.map((item) => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <View style={styles.cartHeaderRow}>
                      <View style={styles.cartInfo}>
                        <Text style={styles.cartName} numberOfLines={1}>
                          {item.product.name}
                        </Text>
                        <Text style={styles.cartDefaultPrice}>
                          Default: NPR {item.product.price.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.cartSubtotalWrap}>
                        <Text style={styles.cartSubtotalLabel}>Line total</Text>
                        <Text style={styles.cartSubtotalValue}>
                          NPR {(item.unitPrice * item.quantity).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cartEditorRow}>
                      <View style={styles.cartPriceColumn}>
                        <View style={styles.cartPriceLabelRow}>
                          <Text style={styles.cartPriceLabel}>Selling price</Text>
                          <Pressable
                            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                            onPress={() => updateCartPrice(item.product.id, String(item.product.price))}
                          >
                            <Text style={styles.resetPriceLink}>Reset</Text>
                          </Pressable>
                        </View>
                        <View style={styles.cartPriceInputWrap}>
                          <Text style={styles.cartPricePrefix}>NPR</Text>
                          <TextInput
                            style={styles.cartPriceInput}
                            keyboardType="decimal-pad"
                            value={String(item.unitPrice)}
                            onChangeText={(value) => updateCartPrice(item.product.id, value)}
                            selectTextOnFocus
                            returnKeyType="done"
                          />
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
                      </View>

                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeFromCart(item.product.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
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

                <Text style={styles.paymentLabel}>SALE DATE (OPTIONAL)</Text>
                <TextInput
                  style={styles.customerInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={saleDateInput}
                  onChangeText={setSaleDateInput}
                  autoCapitalize="none"
                />
                <View style={styles.dateActions}>
                  <Pressable
                    style={styles.dateChip}
                    onPress={() => setSaleDateInput(new Date().toISOString().slice(0, 10))}
                  >
                    <Text style={styles.dateChipText}>Today</Text>
                  </Pressable>
                  {saleDateInput.trim() ? (
                    <Pressable style={styles.dateChip} onPress={() => setSaleDateInput('')}>
                      <Text style={styles.dateChipText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.dateHint}>
                  Leave blank for today, or enter the real past date to backfill an older sale.
                </Text>

                <View style={styles.divider} />

                <Text style={styles.paymentLabel}>CUSTOMER (OPTIONAL)</Text>
                {selectedCustomer ? (
                  <View style={styles.selectedCustomerRow}>
                    <View style={styles.selectedCustomerAvatar}>
                      <Text style={styles.selectedCustomerAvatarText}>
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.selectedCustomerName} numberOfLines={1}>
                      {selectedCustomer.name}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                      }}
                    >
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
                      onChangeText={(value) => {
                        setCustomerSearch(value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 ? (
                      <View style={styles.dropdown}>
                        {filteredCustomers.slice(0, 4).map((customer) => (
                          <Pressable
                            key={customer.id}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectCustomer(customer)}
                          >
                            <Text style={styles.dropdownName}>{customer.name}</Text>
                            {customer.phone ? (
                              <Text style={styles.dropdownSub}>{customer.phone}</Text>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {customerSearch.trim() && filteredCustomers.length === 0 ? (
                      <Text style={styles.newCustomerHint}>
                        New customer will be created: {`"${customerSearch.trim()}"`}
                      </Text>
                    ) : null}
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.paymentLabel}>PAYMENT METHOD</Text>
                <View style={styles.paymentRow}>
                  {(['CASH', 'CARD', 'ESEWA', 'DUE'] as PaymentMethod[]).map((method) => (
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
                      <Text
                        style={[
                          styles.paymentBtnText,
                          paymentMethod === method && styles.paymentBtnTextActive,
                        ]}
                      >
                        {method === 'ESEWA' ? 'eSewa' : method}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {paymentMethod === 'DUE' && !selectedCustomer && !customerSearch.trim() ? (
                  <Text style={styles.dueWarning}>
                    Select or enter a customer to use DUE payment.
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyCartTitle}>Cart is empty</Text>
                <Text style={styles.emptyCartText}>Search for a product above to add it.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.completeBtn,
                (cart.length === 0 || submitting) && styles.completeBtnDisabled,
                pressed && !submitting && cart.length > 0 && { opacity: 0.85 },
              ]}
              onPress={handleCompleteSale}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.completeBtnText}>
                  {cart.length === 0
                    ? 'Add items to complete sale'
                    : paymentMethod === 'ESEWA'
                      ? `Show eSewa QR | NPR ${totalAmount.toLocaleString()}`
                      : `Complete Sale | NPR ${totalAmount.toLocaleString()}`}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={() => {
                setRefreshingHistory(true);
                void loadHistory(true);
              }}
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
          renderItem={renderHistoryItem}
        />
      )}

      <ImportSalesModal
        visible={showImportModal}
        products={allProducts}
        onClose={() => setShowImportModal(false)}
        onImported={() => {
          setShowImportModal(false);
          setTab('history');
          void loadPOS();
          void loadHistory();
          Alert.alert('Import Complete', 'Historical sales were imported successfully.');
        }}
      />

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanned={(value) => void handleBarcodeLookup(value)}
        title="Scan product for POS"
        subtitle="Scan a product barcode or QR code to open its details before adding it to the cart."
      />

      <Modal visible={!!scannedProduct} animationType="slide" transparent onRequestClose={() => setScannedProduct(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Scanned Product</Text>
                <Text style={styles.modalSubtitle}>Review the product before adding it to the cart.</Text>
              </View>
              <ModalCloseButton onPress={() => setScannedProduct(null)} />
            </View>

            {scannedProduct ? (
              <View style={styles.productDetailCard}>
                <Text style={styles.productDetailName}>{scannedProduct.name}</Text>
                <Text style={styles.productDetailMeta}>
                  {[scannedProduct.sku, scannedProduct.category].filter(Boolean).join(' | ') || 'No SKU or category'}
                </Text>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Price</Text>
                  <Text style={styles.productDetailValue}>Rs. {scannedProduct.price.toLocaleString()}</Text>
                </View>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Stock</Text>
                  <Text style={styles.productDetailValue}>{scannedProduct.quantity} units</Text>
                </View>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Barcode</Text>
                  <Text style={styles.productDetailValue} numberOfLines={1}>
                    {scannedProduct.barcode || 'Not saved'}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryBtn} onPress={() => setScannedProduct(null)}>
                <Text style={styles.modalSecondaryBtnText}>Close</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  if (scannedProduct) addToCart(scannedProduct);
                  setScannedProduct(null);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Add to Cart</Text>
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
  stickyTop: { backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  importBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  posLayout: { flex: 1 },
  posScroll: { flex: 1 },
  scroll: { paddingBottom: 18 },

  searchSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  scanBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResults: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 6,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  searchResultSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  searchResultRight: { alignItems: 'flex-end' },
  searchResultPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  searchResultStock: { fontSize: 11, color: Colors.textMuted },
  searchEmpty: { padding: 16, alignItems: 'center' },
  searchEmptyText: { fontSize: 13, color: Colors.textMuted },

  cartSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  cartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  cartRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  cartInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  cartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cartName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  cartDefaultPrice: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  cartSubtotalWrap: {
    alignItems: 'flex-end',
    minWidth: 92,
  },
  cartSubtotalLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  cartSubtotalValue: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginTop: 3 },
  cartEditorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  cartPriceColumn: { flex: 1 },
  cartPriceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cartPriceLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  resetPriceLink: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  cartPriceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.cardMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 12,
    height: 46,
  },
  cartPricePrefix: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginRight: 8 },
  cartPriceInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 70,
  },
  cartControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardMuted,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  stepBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: Colors.textMuted },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.textDark },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  customerInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: 4,
  },
  dateActions: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  dateChipText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  dateHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  dropdown: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownName: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  dropdownSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  newCustomerHint: { fontSize: 11, color: Colors.primary, fontStyle: 'italic', marginBottom: 4 },
  selectedCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 10,
    padding: 9,
    marginBottom: 4,
  },
  selectedCustomerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCustomerAvatarText: {
    color: Colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedCustomerName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textDark },
  paymentRow: { flexDirection: 'row', gap: 6 },
  paymentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  paymentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentBtnDue: { borderColor: Colors.danger },
  paymentBtnDueActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  paymentBtnText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  paymentBtnTextActive: { color: Colors.textOnPrimary },
  dueWarning: { fontSize: 11, color: Colors.danger, marginTop: 6, fontWeight: '500' },

  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyCartTitle: { fontSize: 16, fontWeight: '600', color: Colors.textDark },
  emptyCartText: { fontSize: 13, color: Colors.textMuted },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeBtnDisabled: { backgroundColor: Colors.textMuted },
  completeBtnText: { color: Colors.textOnPrimary, fontSize: 15, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 40, gap: 10, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  historyList: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 100 },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyDate: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  historyTime: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  historyCustomer: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  historyTotal: { alignItems: 'flex-end', gap: 4 },
  historyTotalValue: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  historyMethodBadge: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyMethodDue: { backgroundColor: Colors.dangerLight, borderColor: Colors.dangerBorder },
  historyMethodText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  historyMethodDueText: { color: Colors.danger },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
  },
  historyItemName: { fontSize: 12, color: Colors.textDark, flex: 1 },
  historyItemQty: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  historyMore: { fontSize: 11, color: Colors.primary, fontWeight: '500', marginTop: 6 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    gap: 18,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  modalTitle: { fontSize: 19, fontWeight: '700', color: Colors.textDark },
  modalSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  productDetailCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.background,
    padding: 16,
    gap: 10,
  },
  productDetailName: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  productDetailMeta: { fontSize: 12, color: Colors.textMuted },
  productDetailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  productDetailLabel: { fontSize: 13, color: Colors.textMuted },
  productDetailValue: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.textDark },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalSecondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textOnPrimary },
});
