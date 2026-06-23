import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { customersService } from '@/services/customers';
import { leadsService } from '@/services/leads';

type CrmSnapshot = {
  customerCount: number;
  dueCustomers: number;
  leadCount: number;
  overdueLeads: number;
};

const EMPTY_SNAPSHOT: CrmSnapshot = {
  customerCount: 0,
  dueCustomers: 0,
  leadCount: 0,
  overdueLeads: 0,
};

export default function CrmHub() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<CrmSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [customers, dueCustomers, leads, overdueLeads] = await Promise.all([
        customersService.getCustomers(0, 1),
        customersService.getCustomersWithDue().catch(() => []),
        leadsService.getLeads(0, 1),
        leadsService.getLeads(0, 1, { overdueOnly: true }).catch(() => ({
          content: [],
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasNext: false,
        })),
      ]);

      setSnapshot({
        customerCount: customers.totalElements,
        dueCustomers: dueCustomers.length,
        leadCount: leads.totalElements,
        overdueLeads: overdueLeads.totalElements,
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

  const openCustomers = () => router.push('/(tabs)/crm/customers');
  const openLeads = () => router.push('/(tabs)/crm/leads');

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
          <Text style={styles.eyebrow}>Relationship desk</Text>
          <Text style={styles.title}>Customers and leads, in one place</Text>
          <Text style={styles.subtitle}>
            Follow up on unpaid balances, track new opportunities, and keep your pipeline moving.
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroValue}>{snapshot.customerCount}</Text>
            <Text style={styles.heroLabel}>Customers</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroMetric}>
            <Text style={styles.heroValue}>{snapshot.leadCount}</Text>
            <Text style={styles.heroLabel}>Active leads</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <>
            <Pressable style={styles.featureCard} onPress={openCustomers}>
              <View style={styles.featureIcon}>
                <Ionicons name="people-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.featureBody}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>Customers</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
                <Text style={styles.featureText}>
                  {snapshot.dueCustomers > 0
                    ? `${snapshot.dueCustomers} customer${snapshot.dueCustomers === 1 ? '' : 's'} have unpaid balance.`
                    : 'No unpaid customer balances need attention right now.'}
                </Text>
                <View style={styles.featureMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillValue}>{snapshot.customerCount}</Text>
                    <Text style={styles.metaPillLabel}>total</Text>
                  </View>
                  <View style={[styles.metaPill, styles.metaPillAlert]}>
                    <Text style={[styles.metaPillValue, styles.metaAlertText]}>{snapshot.dueCustomers}</Text>
                    <Text style={[styles.metaPillLabel, styles.metaAlertText]}>with due</Text>
                  </View>
                </View>
              </View>
            </Pressable>

            <Pressable style={styles.featureCard} onPress={openLeads}>
              <View style={[styles.featureIcon, styles.featureIconWarm]}>
                <Ionicons name="git-branch-outline" size={22} color={Colors.warning} />
              </View>
              <View style={styles.featureBody}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>Leads</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
                <Text style={styles.featureText}>
                  {snapshot.overdueLeads > 0
                    ? `${snapshot.overdueLeads} lead follow-up${snapshot.overdueLeads === 1 ? '' : 's'} are overdue.`
                    : 'Your lead pipeline is up to date for now.'}
                </Text>
                <View style={styles.featureMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillValue}>{snapshot.leadCount}</Text>
                    <Text style={styles.metaPillLabel}>in pipeline</Text>
                  </View>
                  <View style={[styles.metaPill, styles.metaPillWarm]}>
                    <Text style={[styles.metaPillValue, styles.metaWarmText]}>{snapshot.overdueLeads}</Text>
                    <Text style={[styles.metaPillLabel, styles.metaWarmText]}>overdue</Text>
                  </View>
                </View>
              </View>
            </Pressable>

            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>What to check next</Text>
              <View style={styles.noteRow}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.noteText}>Review due customers before adding new credit sales.</Text>
              </View>
              <View style={styles.noteRow}>
                <Ionicons name="call-outline" size={16} color={Colors.primary} />
                <Text style={styles.noteText}>Keep lead follow-ups fresh so warm prospects do not go cold.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 10 },
  header: { marginBottom: 18 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textDark, lineHeight: 30 },
  subtitle: { fontSize: 14, color: Colors.textMuted, lineHeight: 21, marginTop: 8 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  heroMetric: { flex: 1 },
  heroValue: { fontSize: 30, fontWeight: '800', color: Colors.textDark },
  heroLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginTop: 4 },
  heroDivider: { width: 1, height: 42, backgroundColor: Colors.border, marginHorizontal: 16 },
  loader: { marginTop: 40 },
  featureCard: {
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
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  featureIconWarm: { backgroundColor: Colors.warningLight },
  featureBody: { flex: 1 },
  featureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  featureText: { fontSize: 13, lineHeight: 19, color: Colors.textMuted, marginTop: 6 },
  featureMetaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metaPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
  },
  metaPillAlert: { backgroundColor: Colors.dangerLight },
  metaPillWarm: { backgroundColor: Colors.warningLight },
  metaPillValue: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  metaPillLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  metaAlertText: { color: Colors.danger },
  metaWarmText: { color: Colors.warning },
  notesCard: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  notesTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark, marginBottom: 12 },
  noteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.textDark },
});
