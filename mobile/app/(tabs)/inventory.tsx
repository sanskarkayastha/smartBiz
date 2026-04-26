import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import SearchBar from '@/components/ui/SearchBar';
import FilterTabs from '@/components/ui/FilterTabs';
import StatusBadge from '@/components/ui/StatusBadge';
import { inventoryService, Product } from '@/services/inventory';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

function getStatus(product: Product): StockStatus {
  if (product.quantity === 0) return 'Out of Stock';
  if (product.reorderLevel != null && product.quantity <= product.reorderLevel) return 'Low Stock';
  return 'In Stock';
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

  const filtered = products.filter((p) => {
    const status = getStatus(p);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'All Items' || status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Pressable><Ionicons name="notifications-outline" size={24} color={Colors.textDark} /></Pressable>
      </View>

      <SearchBar placeholder="Search products, SKU..." value={search} onChangeText={setSearch} showFilter />
      <FilterTabs tabs={TABS} active={activeTab} onSelect={setActiveTab} />

      {loading
        ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No products found</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const status = getStatus(item);
              const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
              return (
                <Pressable style={styles.card}>
                  <View style={[styles.productImage, { backgroundColor: bgColor }]}>
                    <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
                  </View>
                  <View style={styles.productInfo}>
                    <View style={styles.productTopRow}>
                      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                      <StatusBadge status={status} />
                    </View>
                    <Text style={styles.productSku}>SKU: {item.sku} · {item.category}</Text>
                    <View style={styles.productBottomRow}>
                      <Text style={styles.productPrice}>Rs. {item.price.toLocaleString()}</Text>
                      <Text style={styles.productQty}>{item.quantity} units</Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

      <Pressable style={styles.fab} onPress={() => router.push('/add-product')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
  card: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12, alignItems: 'center' },
  productImage: { width: 64, height: 64, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 },
  productName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, flex: 1 },
  productSku: { fontSize: 11, color: Colors.textMuted, marginBottom: 6 },
  productBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  productQty: { fontSize: 12, color: Colors.textMuted },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
});
