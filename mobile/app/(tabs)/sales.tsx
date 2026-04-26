import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Colors } from '@/components/ui/colors';
import SearchBar from '@/components/ui/SearchBar';
import { inventoryService, Product } from '@/services/inventory';
import { salesService } from '@/services/sales';

const PLACEHOLDER_COLORS = ['#FEF3C7', '#DCFCE7', '#FEE2E2', '#F3E8FF'];

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inventoryService.getProducts()
      .then((data) => setProducts(data.filter((p) => p.quantity > 0)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateQty = (id: number, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const clearCart = () => setQuantities({});

  const cartItems = products.filter((p) => (quantities[p.id] ?? 0) > 0);
  const totalItems = cartItems.reduce((s, p) => s + (quantities[p.id] ?? 0), 0);
  const totalAmount = cartItems.reduce((s, p) => s + p.price * (quantities[p.id] ?? 0), 0);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const items = cartItems.map((p) => ({ productId: p.id, quantity: quantities[p.id] }));
      await salesService.createSale(items);
      Alert.alert('Sale Recorded!', `Total: NPR ${totalAmount.toLocaleString()}`, [
        { text: 'OK', onPress: clearCart },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to record sale. Please try again.';
      Alert.alert('Sale Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={clearCart}><Ionicons name="close" size={24} color={Colors.textDark} /></Pressable>
          <Text style={styles.title}>New Sale</Text>
          <Pressable onPress={clearCart}><Text style={styles.clearText}>Clear</Text></Pressable>
        </View>

        <SearchBar placeholder="Search products..." value={search} onChangeText={setSearch} />

        <Text style={styles.sectionLabel}>POPULAR ITEMS</Text>

        {loading
          ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          : (
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
                      <Pressable style={styles.stepBtn} onPress={() => updateQty(product.id, -1)}>
                        <Ionicons name="remove" size={16} color={Colors.textDark} />
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
              <Text style={styles.cartTitle}>CURRENT CART ({totalItems})</Text>
              <Pressable><Text style={styles.editText}>Edit ✎</Text></Pressable>
            </View>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartRow}>
                <Text style={styles.cartQty}>{quantities[item.id]}x</Text>
                <Text style={styles.cartName}>{item.name}</Text>
                <Text style={styles.cartPrice}>NPR {(item.price * (quantities[item.id] ?? 0)).toLocaleString()}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>NPR {totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.completeBtn, (cartItems.length === 0 || submitting) && styles.completeBtnDisabled]}
          onPress={handleCompleteSale}
          disabled={cartItems.length === 0 || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.completeBtnText}>Complete Sale →</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  clearText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  productCard: { width: '47%', backgroundColor: Colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  productImage: { height: 110, justifyContent: 'flex-end', padding: 8 },
  priceOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  productName: { fontSize: 13, fontWeight: '600', color: Colors.textDark, padding: 8, paddingBottom: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingBottom: 10 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  stepBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepCount: { fontSize: 15, fontWeight: '700', color: Colors.textDark, minWidth: 20, textAlign: 'center' },
  cartSection: { backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cartTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6 },
  editText: { fontSize: 13, color: Colors.primary },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  cartQty: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, width: 28 },
  cartName: { flex: 1, fontSize: 13, color: Colors.textDark },
  cartPrice: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: Colors.textMuted },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  completeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  completeBtnDisabled: { opacity: 0.4 },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
