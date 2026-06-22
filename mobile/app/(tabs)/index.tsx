import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getDailyInsight } from '@/services/ai';
import { customersService, type Customer } from '@/services/customers';
import { inventoryService, type Product } from '@/services/inventory';
import { salesService, type DailyRevenue, type Sale, type SaleSummary } from '@/services/sales';

function formatCurrency(value: number) {
  return `NPR ${Math.round(value).toLocaleString()}`;
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getRevenueTrend(weeklyData: DailyRevenue[]) {
  const sorted = [...weeklyData].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
  const today = sorted.at(-1)?.revenue ?? 0;
  const yesterday = sorted.at(-2)?.revenue ?? 0;

  if (yesterday <= 0) {
    return {
      positive: today > 0,
      text: today > 0 ? 'Sales started today' : 'Waiting for first sale',
    };
  }

  const change = ((today - yesterday) / yesterday) * 100;
  const rounded = Math.round(Math.abs(change));
  return {
    positive: change >= 0,
    text: `${rounded}% ${change >= 0 ? 'from yesterday' : 'below yesterday'}`,
  };
}

function getBestDay(weeklyData: DailyRevenue[]) {
  return weeklyData.reduce<DailyRevenue | null>((best, day) => {
    if (!best || day.revenue > best.revenue) return day;
    return best;
  }, null);
}

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (isToday(date)) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-NP', { month: 'short', day: 'numeric' });
}

function activityIconName(paymentMethod: string) {
  if (paymentMethod === 'DUE') return 'time-outline';
  if (paymentMethod === 'DIGITAL') return 'phone-portrait-outline';
  if (paymentMethod === 'CARD') return 'card-outline';
  return 'cart-outline';
}

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const initialLoadRef = useRef(true);

  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyRevenue[]>([]);
  const [dueCustomers, setDueCustomers] = useState<Customer[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [dailySummary, lowStockProducts, weeklySummary, dueList, salesHistory] = await Promise.all([
        salesService.getDailySummary(),
        inventoryService.getLowStockProducts(),
        salesService.getWeeklySummary(),
        customersService.getCustomersWithDue().catch(() => []),
        salesService.getSales().catch(() => []),
      ]);

      setSummary(dailySummary);
      setLowStock(lowStockProducts);
      setWeeklyData(weeklySummary);
      setDueCustomers(dueList);
      setRecentSales(
        [...salesHistory].sort(
          (left, right) => new Date(right.saleDate).getTime() - new Date(left.saleDate).getTime(),
        ),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadRef.current) {
        setLoading(true);
      }
      void load();
    }, [load]),
  );

  const fetchInsight = async () => {
    if (insightLoading) return;
    setInsightLoading(true);
    try {
      const insight = await getDailyInsight();
      setAiInsight(insight);
    } catch {
      setAiInsight('Could not load insight right now. Try again in a moment.');
    } finally {
      setInsightLoading(false);
    }
  };

  const greeting = getGreeting(new Date().getHours());
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const initials = user?.fullName
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'SB';
  const revenueTrend = getRevenueTrend(weeklyData);
  const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.revenue, 0);
  const bestDay = getBestDay(weeklyData);
  const useTwoColumnQuickActions = width < 520;
  const stackAiCard = width < 430;
  const stackBottomSections = width < 720;

  const quickActions = [
    {
      icon: 'add-outline' as const,
      label: 'New Sale',
      onPress: () => router.push('/(tabs)/sales'),
    },
    {
      icon: 'cube-outline' as const,
      label: 'Add Product',
      onPress: () => router.push('/add-product'),
    },
    {
      icon: 'people-outline' as const,
      label: 'Customers',
      onPress: () => router.push('/(tabs)/customers'),
    },
    {
      icon: 'git-branch-outline' as const,
      label: 'Leads',
      onPress: () => router.push('/(tabs)/leads'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          void load();
        }} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.welcomeText}>{greeting},</Text>
              <Text style={styles.userName}>{user?.fullName ?? firstName}</Text>
            </View>
          </View>

          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textDark} />
            {dueCustomers.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{Math.min(dueCustomers.length, 9)}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Revenue Today</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.textOnPrimary} style={styles.heroLoader} />
          ) : error ? (
            <Text style={styles.heroValue}>NPR -</Text>
          ) : (
            <>
              <Text style={styles.heroValue}>{formatCurrency(summary?.totalRevenue ?? 0)}</Text>
              <View style={styles.heroTrendRow}>
                <Ionicons
                  name={revenueTrend.positive ? 'arrow-up-outline' : 'arrow-down-outline'}
                  size={16}
                  color={revenueTrend.positive ? '#8AF5B2' : '#FFD1B0'}
                />
                <Text
                  style={[
                    styles.heroTrendText,
                    revenueTrend.positive ? styles.heroTrendPositive : styles.heroTrendNegative,
                  ]}
                >
                  {revenueTrend.text}
                </Text>
              </View>
            </>
          )}

          <View style={styles.heroDivider} />

          <View style={styles.heroBottom}>
            <View style={styles.heroMetricBlock}>
              <View style={styles.metricIconBubble}>
                <Ionicons name="receipt-outline" size={18} color={Colors.textOnPrimary} />
              </View>
              <View>
                <Text style={styles.heroMetricLabel}>Orders</Text>
                <Text style={styles.heroMetricValue}>{summary?.orderCount ?? 0}</Text>
              </View>
            </View>

            <View style={styles.heroMetricDivider} />

            <View style={styles.heroMetricBlock}>
              <View style={styles.metricIconBubble}>
                <Ionicons name="wallet-outline" size={18} color={Colors.textOnPrimary} />
              </View>
              <View>
                <Text style={styles.heroMetricLabel}>Avg. Ticket</Text>
                <Text style={styles.heroMetricValue}>{formatCurrency(summary?.avgOrderValue ?? 0)}</Text>
              </View>
            </View>
          </View>

          {(summary?.totalDue ?? 0) > 0 && (
            <View style={styles.dueHint}>
              <Ionicons name="alert-circle-outline" size={14} color="#FFE5D4" />
              <Text style={styles.dueHintText}>
                {formatCurrency(summary?.totalDue ?? 0)} still due from customers
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, styles.lowStockCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.warningBubble}>
                <Ionicons name="warning-outline" size={16} color={Colors.danger} />
              </View>
              <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/inventory')}>
              <Text style={styles.linkText}>View all</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
          ) : lowStock.length === 0 ? (
            <Text style={styles.emptySectionText}>No low stock items right now.</Text>
          ) : (
            <View style={styles.lowStockGrid}>
              {lowStock.slice(0, 3).map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.lowStockItem}
                  onPress={() => router.push('/(tabs)/inventory')}
                >
                  <View style={styles.lowStockThumb}>
                    <Ionicons name="cube-outline" size={18} color={Colors.textDark} />
                  </View>
                  <View style={styles.lowStockInfo}>
                    <Text style={styles.lowStockName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.lowStockQty}>{item.quantity} left</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View
            style={[
              styles.quickActionsGrid,
              useTwoColumnQuickActions && styles.quickActionsGridCompact,
            ]}
          >
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                style={[
                  styles.quickActionCard,
                  useTwoColumnQuickActions && styles.quickActionCardCompact,
                ]}
                onPress={action.onPress}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon} size={22} color={Colors.primary} />
                </View>
                <Text style={styles.quickActionLabel} numberOfLines={2}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.aiCard,
            dueCustomers.length > 0 && styles.aiCardElevated,
            stackAiCard && styles.aiCardStacked,
          ]}
        >
          <View style={[styles.aiLead, stackAiCard && styles.aiLeadStacked]}>
            <View style={styles.aiBotWrap}>
              <Ionicons name="sparkles" size={24} color={Colors.primary} />
            </View>
            <View style={styles.aiBody}>
              <Text style={styles.aiTitle}>AI Business Coach</Text>
              <Text style={styles.aiText}>
                {aiInsight ?? 'Tap once to pull a fresh business insight based on your latest sales, stock, and due amounts.'}
              </Text>
            </View>
          </View>
          <Pressable
            style={[
              styles.aiButton,
              stackAiCard && styles.aiButtonStacked,
              insightLoading && { opacity: 0.7 },
            ]}
            onPress={aiInsight ? () => router.push('/(tabs)/ai') : fetchInsight}
            disabled={insightLoading}
          >
            {insightLoading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
                <Text style={styles.aiButtonText}>{aiInsight ? 'Open AI' : 'Ask AI'}</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={[styles.bottomGrid, stackBottomSections && styles.bottomGridCompact]}>
          <View style={[styles.sectionCard, styles.bottomCard, stackBottomSections && styles.bottomCardCompact]}>
            <View style={[styles.sectionHeader, styles.sectionHeaderTopAligned]}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <Pressable onPress={() => router.push('/(tabs)/sales')}>
                <Text style={styles.linkText}>View report</Text>
              </Pressable>
            </View>
            <Text style={styles.weekValue}>{formatCurrency(weeklyTotal)}</Text>
            <Text style={styles.weekSubText}>
              {bestDay ? `Best day: ${new Date(bestDay.date).toLocaleDateString('en-NP', { weekday: 'long' })}` : 'Weekly performance starts after your first sale.'}
            </Text>

            <View style={styles.chartRow}>
              {(weeklyData.length > 0 ? weeklyData : Array.from({ length: 7 }, (_, index) => ({
                date: `placeholder-${index}`,
                revenue: 0,
              }))).map((day, index, list) => {
                const maxRevenue = Math.max(...weeklyData.map((entry) => entry.revenue), 1);
                const height = weeklyData.length > 0 ? Math.max((day.revenue / maxRevenue) * 86, 12) : 14 + (index % 3) * 8;
                const active = bestDay?.date === day.date || (!weeklyData.length && index === 3);

                return (
                  <View key={`${day.date}-${index}`} style={styles.barItem}>
                    <View
                      style={[
                        styles.bar,
                        active ? styles.barActive : styles.barInactive,
                        index === list.length - 1 && styles.barLast,
                        { height },
                      ]}
                    />
                    <Text style={styles.barDay}>
                      {weeklyData.length > 0
                        ? new Date(day.date).toLocaleDateString('en-NP', { weekday: 'narrow' })
                        : ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {bestDay && (
              <View style={styles.bestDayStrip}>
                <View>
                  <Text style={styles.bestDayLabel}>Best day</Text>
                  <Text style={styles.bestDayValue}>
                    {new Date(bestDay.date).toLocaleDateString('en-NP', { weekday: 'long' })}
                  </Text>
                </View>
                <Text style={styles.bestDayAmount}>{formatCurrency(bestDay.revenue)}</Text>
              </View>
            )}
          </View>

          <View style={[styles.sectionCard, styles.bottomCard, stackBottomSections && styles.bottomCardCompact]}>
            <View style={[styles.sectionHeader, styles.sectionHeaderTopAligned]}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Pressable onPress={() => router.push('/(tabs)/sales')}>
                <Text style={styles.linkText}>Open sales</Text>
              </Pressable>
            </View>

            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
            ) : recentSales.length === 0 ? (
              <Text style={styles.emptySectionText}>Recent sales will appear here once transactions are recorded.</Text>
            ) : (
              recentSales.slice(0, 3).map((sale, index) => (
                <View key={sale.id} style={[styles.activityRow, index === 0 && styles.activityRowFirst]}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={activityIconName(sale.paymentMethod)} size={18} color={Colors.success} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle}>
                      {sale.customerName ? sale.customerName : `Sale #${sale.id}`}
                    </Text>
                    <Text style={styles.activityValue}>{formatCurrency(sale.totalAmount)}</Text>
                  </View>
                  <Text style={styles.activityTime}>{formatActivityTime(sale.saleDate)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: Colors.textOnPrimary },
  headerCopy: { flex: 1 },
  welcomeText: { fontSize: 14, color: Colors.textMuted, marginBottom: 2 },
  userName: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingHorizontal: 4,
  },
  notificationBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.textOnPrimary },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowOne: {
    position: 'absolute',
    top: -32,
    right: -18,
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 15, color: 'rgba(255,255,255,0.88)', fontWeight: '500' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6DFF9F' },
  liveText: { fontSize: 12, fontWeight: '700', color: Colors.textOnPrimary },
  heroLoader: { marginVertical: 22 },
  heroValue: { fontSize: 40, fontWeight: '800', color: Colors.textOnPrimary, marginTop: 18 },
  heroTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroTrendText: { fontSize: 13, fontWeight: '600' },
  heroTrendPositive: { color: '#C7FFD6' },
  heroTrendNegative: { color: '#FFE5D4' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 18 },
  heroBottom: { flexDirection: 'row', alignItems: 'center' },
  heroMetricBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroMetricDivider: { width: 1, height: 46, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 12 },
  heroMetricLabel: { fontSize: 12, color: 'rgba(255,255,255,0.72)' },
  heroMetricValue: { fontSize: 18, fontWeight: '800', color: Colors.textOnPrimary, marginTop: 2 },
  dueHint: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(18,31,65,0.18)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dueHintText: { fontSize: 12, fontWeight: '600', color: '#FFE5D4' },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  lowStockCard: {
    backgroundColor: '#FFF8F6',
    borderColor: '#FBE1DA',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionHeaderTopAligned: {
    alignItems: 'flex-start',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warningBubble: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  linkText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  emptySectionText: { fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  lowStockGrid: { flexDirection: 'row', gap: 10 },
  lowStockItem: { flex: 1, gap: 10 },
  lowStockThumb: {
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lowStockInfo: { gap: 4 },
  lowStockName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  lowStockQty: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  quickActionsGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickActionsGridCompact: {
    flexWrap: 'wrap',
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.cardMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionCardCompact: {
    flexBasis: '48%',
    maxWidth: '48%',
    minHeight: 122,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 15,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginBottom: 16,
  },
  aiCardStacked: {
    alignItems: 'stretch',
  },
  aiCardElevated: { shadowColor: Colors.shadow, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  aiLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  aiLeadStacked: {
    alignItems: 'flex-start',
  },
  aiBotWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  aiBody: { flex: 1 },
  aiTitle: { fontSize: 17, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  aiText: { fontSize: 13, lineHeight: 18, color: Colors.textDark },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  aiButtonStacked: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 62,
  },
  aiButtonText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  bottomGrid: { flexDirection: 'row', gap: 12 },
  bottomGridCompact: { flexDirection: 'column' },
  bottomCard: { flex: 1, marginBottom: 0 },
  bottomCardCompact: { marginBottom: 0 },
  weekValue: { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  weekSubText: { fontSize: 13, lineHeight: 19, color: Colors.textMuted, marginTop: 6 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
    height: 124,
  },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  bar: { width: 18, borderRadius: 7 },
  barActive: { backgroundColor: Colors.primary },
  barInactive: { backgroundColor: '#B7CCFF' },
  barLast: { marginRight: 0 },
  barDay: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  bestDayStrip: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 14,
    backgroundColor: Colors.cardMuted,
  },
  bestDayLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  bestDayValue: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginTop: 3 },
  bestDayAmount: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  activityRowFirst: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successLight,
  },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  activityValue: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  activityTime: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
});
