import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '@/components/ui/colors';
import { useAuth } from '@/contexts/AuthContext';
import { salesService, SaleSummary } from '@/services/sales';
import { inventoryService, Product } from '@/services/inventory';

const BAR_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BAR_HEIGHTS = [0.5, 0.8, 0.6, 1.0, 0.7, 0.4, 0.3];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [sum, ls] = await Promise.all([
        salesService.getDailySummary(),
        inventoryService.getLowStockProducts(),
      ]);
      setSummary(sum);
      setLowStock(ls);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.fullName ?? 'User'}</Text>
            </View>
          </View>
          <Pressable style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textDark} />
          </Pressable>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <Text style={styles.statsLabel}>Total Sales Today</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 14 }} />
          ) : error ? (
            <Text style={styles.statsValue}>—</Text>
          ) : (
            <Text style={styles.statsValue}>
              NPR {(summary?.totalRevenue ?? 0).toLocaleString()}
            </Text>
          )}
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statsSubLabel}>Orders</Text>
              <Text style={styles.statsSubValue}>{summary?.orderCount ?? 0}</Text>
            </View>
            <View style={styles.statsDivider} />
            <View>
              <Text style={styles.statsSubLabel}>Avg. Value</Text>
              <Text style={styles.statsSubValue}>
                NPR {Math.round(summary?.avgOrderValue ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.statsDivider} />
            <Pressable onPress={load}>
              <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(tabs)/sales')}>
            <View style={styles.actionIcon}>
              <Ionicons name="receipt-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>New Sale</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/add-product')}>
            <View style={styles.actionIcon}>
              <Ionicons name="cube-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Add Product</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/(tabs)/inventory')}>
            <View style={styles.actionIcon}>
              <Ionicons name="layers-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Inventory</Text>
          </Pressable>
        </View>

        {/* Low Stock Alert */}
        {(loading || lowStock.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.alertTitle}>
                <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                <Text style={styles.sectionTitle}>Low Stock Alert</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/inventory')}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
            ) : (
              lowStock.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.stockRow}>
                  <View style={styles.stockIcon}>
                    <Ionicons name="cube-outline" size={16} color={Colors.warning} />
                  </View>
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
                    {item.category ? <Text style={styles.stockSub}>{item.category}</Text> : null}
                  </View>
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockBadgeText}>{item.quantity} left</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Weekly Revenue Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Revenue</Text>
            <Text style={styles.chartNote}>Sample data</Text>
          </View>
          <View style={styles.chartContainer}>
            {BAR_DAYS.map((day, i) => (
              <View key={i} style={styles.barWrapper}>
                <View style={[styles.bar, { height: BAR_HEIGHTS[i] * 72 }]} />
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  welcomeText: { fontSize: 12, color: Colors.textMuted },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statsCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 20, marginBottom: 16 },
  statsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  statsValue: { fontSize: 34, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statsSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  statsSubValue: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statsDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  actionBtn: { alignItems: 'center', gap: 6, flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionLabel: { fontSize: 11, color: Colors.textDark, fontWeight: '500', textAlign: 'center' },
  section: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  alertTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  chartNote: { fontSize: 11, color: Colors.textMuted },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  stockIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.warningLight, justifyContent: 'center', alignItems: 'center' },
  stockInfo: { flex: 1, minWidth: 0 },
  stockName: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  stockSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  stockBadge: { backgroundColor: Colors.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.danger },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 90, paddingTop: 8 },
  barWrapper: { alignItems: 'center', gap: 4, flex: 1 },
  bar: { width: 22, backgroundColor: Colors.primary, borderRadius: 4, opacity: 0.8 },
  barLabel: { fontSize: 10, color: Colors.textMuted },
});
