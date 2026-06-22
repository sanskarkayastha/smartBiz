import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supplierService } from '@/services/suppliers';

type MoreSnapshot = {
  totalSuppliers: number;
  restockSuppliers: number;
  balanceOwed: number;
};

const EMPTY_SNAPSHOT: MoreSnapshot = {
  totalSuppliers: 0,
  restockSuppliers: 0,
  balanceOwed: 0,
};

function formatCurrency(value: number) {
  return `NPR ${Math.round(value).toLocaleString()}`;
}

export default function MoreHub() {
  const router = useRouter();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<MoreSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const summary = await supplierService.getSupplierSummary().catch(() => null);
      setSnapshot({
        totalSuppliers: summary?.totalSuppliers ?? 0,
        restockSuppliers: summary?.suppliersNeedingRestock ?? 0,
        balanceOwed: summary?.totalBalanceOwed ?? 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const initials = user?.fullName
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'SB';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          void load();
        }} tintColor={Colors.primary} />}
      >
        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.accountBody}>
            <Text style={styles.accountName}>{user?.fullName ?? 'SmartBiz'}</Text>
            <Text style={styles.accountEmail}>{user?.email ?? 'Business account'}</Text>
          </View>
          <Pressable style={styles.settingsButton} onPress={() => router.push('/(tabs)/settings')}>
            <Ionicons name="settings-outline" size={18} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tools and setup</Text>
          <Text style={styles.sectionSubtitle}>The extra places that do not need to stay in the main bottom bar.</Text>
        </View>

        <Pressable style={styles.linkCard} onPress={() => router.push('/(tabs)/suppliers')}>
          <View style={styles.linkIcon}>
            <Ionicons name="business-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.linkBody}>
            <View style={styles.linkHeader}>
              <Text style={styles.linkTitle}>Suppliers</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
            <Text style={styles.linkText}>
              Track who needs restock follow-up and how much supplier balance is still unpaid.
            </Text>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
            ) : (
              <View style={styles.metricsRow}>
                <View style={styles.metricChip}>
                  <Text style={styles.metricValue}>{snapshot.totalSuppliers}</Text>
                  <Text style={styles.metricLabel}>suppliers</Text>
                </View>
                <View style={[styles.metricChip, styles.metricWarm]}>
                  <Text style={[styles.metricValue, styles.metricWarmText]}>{snapshot.restockSuppliers}</Text>
                  <Text style={[styles.metricLabel, styles.metricWarmText]}>need restock</Text>
                </View>
                <View style={styles.metricChip}>
                  <Text style={styles.metricValue}>{formatCurrency(snapshot.balanceOwed)}</Text>
                  <Text style={styles.metricLabel}>balance owed</Text>
                </View>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable style={styles.linkCard} onPress={() => router.push('/(tabs)/ai')}>
          <View style={[styles.linkIcon, styles.linkIconSoft]}>
            <Ionicons name="sparkles-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.linkBody}>
            <View style={styles.linkHeader}>
              <Text style={styles.linkTitle}>AI Assistant</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
            <Text style={styles.linkText}>
              Ask for reorder ideas, insight summaries, invoice parsing, and import help.
            </Text>
          </View>
        </Pressable>

        <Pressable style={styles.linkCard} onPress={() => router.push('/(tabs)/settings')}>
          <View style={[styles.linkIcon, styles.linkIconNeutral]}>
            <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.linkBody}>
            <View style={styles.linkHeader}>
              <Text style={styles.linkTitle}>Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
            <Text style={styles.linkText}>
              Update your profile, manage categories, and handle preferences from here.
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.textOnPrimary },
  accountBody: { flex: 1 },
  accountName: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  accountEmail: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Colors.textDark },
  sectionSubtitle: { fontSize: 13, lineHeight: 19, color: Colors.textMuted, marginTop: 6 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  linkIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  linkIconSoft: { backgroundColor: Colors.backgroundAlt },
  linkIconNeutral: { backgroundColor: Colors.cardMuted },
  linkBody: { flex: 1 },
  linkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkTitle: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  linkText: { fontSize: 13, lineHeight: 19, color: Colors.textMuted, marginTop: 6 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
  },
  metricWarm: { backgroundColor: Colors.warningLight },
  metricValue: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  metricLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  metricWarmText: { color: Colors.warning },
});
