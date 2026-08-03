import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { billingService, type BillingTerm, type PaymentProvider, type PlanStatus } from '@/services/billing';

const PRICES: Record<BillingTerm, { label: string; days: string; price: string }> = {
  MONTHLY: { label: 'Monthly', days: '30 days', price: 'NPR 499' },
  YEARLY: { label: 'Yearly', days: '365 days', price: 'NPR 4,999' },
};

const USAGE_LABELS: Record<string, string> = {
  products: 'Products', sales: 'Sales this month', customers: 'Customers', leads: 'Leads', aiRequests: 'AI requests this month',
};

export default function BillingSettings() {
  const router = useRouter();
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [term, setTerm] = useState<BillingTerm>('YEARLY');
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState<PaymentProvider | null>(null);

  const load = useCallback(async () => {
    try { setStatus(await billingService.getStatus()); }
    catch { Alert.alert('Could not load plan', 'Check your connection and try again.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const pay = async (provider: PaymentProvider) => {
    setCheckout(provider);
    try {
      const payment = await billingService.startCheckout(provider, term);
      if (payment.status === 'SUCCEEDED') {
        await load();
        Alert.alert('SmartBiz Pro is active', `Your ${PRICES[term].days} have been added.`);
      } else {
        Alert.alert('Payment not confirmed', 'Your plan will update only after the provider confirms payment. You can safely check again here.');
      }
    } catch (error: any) {
      Alert.alert('Checkout unavailable', error?.response?.data?.error ?? 'Could not start payment right now.');
    } finally { setCheckout(null); }
  };

  const validUntil = status?.validUntil ? new Date(status.validUntil).toLocaleDateString() : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.title}>Plan & billing</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={Colors.primary} /> : (
          <View style={styles.currentPlan}>
            <View>
              <Text style={styles.eyebrow}>CURRENT PLAN</Text>
              <Text style={styles.planName}>{status?.effectivePlan === 'PRO' ? 'SmartBiz Pro' : 'SmartBiz Free'}</Text>
              <Text style={styles.planMeta}>
                {status?.source === 'TRIAL' ? `Trial active until ${validUntil}` : status?.source === 'PURCHASED' ? `Paid access until ${validUntil}` : 'Core tools with monthly limits'}
              </Text>
            </View>
            <View style={[styles.planBadge, status?.effectivePlan === 'PRO' && styles.planBadgePro]}>
              <Text style={styles.planBadgeText}>{status?.source === 'TRIAL' ? 'TRIAL' : status?.effectivePlan}</Text>
            </View>
          </View>
        )}

        {status ? (
          <View style={styles.usageSection}>
            <View style={styles.usageHeadingRow}>
              <Text style={styles.sectionTitle}>Free plan usage</Text>
              {!status.usageAvailable ? <Text style={styles.partialBadge}>PARTIAL</Text> : null}
            </View>
            {Object.entries(status.limits).map(([key, limit]) => (
              <View key={key} style={styles.usageRow}>
                <Text style={styles.usageLabel}>{USAGE_LABELS[key] ?? key}</Text>
                <Text style={styles.usageValue}>{status.usage[key] ?? 'Unavailable'}{status.usage[key] !== undefined ? ` / ${limit}` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Pro term</Text>
          <Text style={styles.sectionCopy}>One payment, no automatic renewal. Buying early preserves the remaining time on your current access.</Text>
          <View style={styles.termRow}>
            {(Object.keys(PRICES) as BillingTerm[]).map((value) => (
              <Pressable key={value} onPress={() => setTerm(value)} style={[styles.term, term === value && styles.termSelected]}>
                <Text style={[styles.termLabel, term === value && styles.termLabelSelected]}>{PRICES[value].label}</Text>
                <Text style={[styles.termPrice, term === value && styles.termLabelSelected]}>{PRICES[value].price}</Text>
                <Text style={styles.termDays}>{PRICES[value].days}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.features}>
          {['Unlimited products, sales and CRM records', 'AI assistance and voice parsing', 'Imports, invoice and barcode scanning', 'Advanced sales trends'].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={19} color={Colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.paymentTitle}>Pay {PRICES[term].price}</Text>
        <Pressable disabled={checkout !== null} onPress={() => pay('ESEWA')} style={styles.primaryButton}>
          {checkout === 'ESEWA' ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.primaryButtonText}>Continue with eSewa</Text>}
        </Pressable>
        <Pressable disabled={checkout !== null} onPress={() => pay('STRIPE')} style={styles.secondaryButton}>
          {checkout === 'STRIPE' ? <ActivityIndicator color={Colors.textDark} /> : (
            <View style={styles.buttonRow}><Text style={styles.secondaryButtonText}>Pay by card with Stripe</Text><Text style={styles.testBadge}>TEST</Text></View>
          )}
        </Pressable>
        <Text style={styles.note}>Stripe is test-only for this project. Your plan changes only after SmartBiz verifies the provider response.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.card },
  title: { fontSize: 21, fontWeight: '800', color: Colors.textDark },
  content: { padding: 16, paddingBottom: 40 },
  currentPlan: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, padding: 20, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: Colors.textMuted },
  planName: { marginTop: 6, fontSize: 24, fontWeight: '800', color: Colors.textDark },
  planMeta: { marginTop: 5, maxWidth: 250, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  planBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: Colors.backgroundAlt },
  planBadgePro: { backgroundColor: Colors.successLight },
  planBadgeText: { fontSize: 10, fontWeight: '900', color: Colors.textDark },
  usageSection: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  usageHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  partialBadge: { fontSize: 9, fontWeight: '900', color: Colors.warning, backgroundColor: Colors.warningLight, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  usageRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border },
  usageLabel: { flex: 1, fontSize: 12, color: Colors.textMuted },
  usageValue: { fontSize: 12, fontWeight: '800', color: Colors.textDark },
  section: { marginTop: 24 }, sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  sectionCopy: { marginTop: 6, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  termRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  term: { flex: 1, minHeight: 112, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  termSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  termLabel: { fontSize: 13, fontWeight: '700', color: Colors.textDark }, termLabelSelected: { color: Colors.textOnPrimary },
  termPrice: { marginTop: 8, fontSize: 18, fontWeight: '900', color: Colors.textDark }, termDays: { marginTop: 4, fontSize: 11, color: Colors.textMuted },
  features: { marginTop: 18, gap: 11, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, featureText: { flex: 1, fontSize: 13, color: Colors.textDark },
  paymentTitle: { marginTop: 22, marginBottom: 10, fontSize: 14, fontWeight: '800', color: Colors.textDark },
  primaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  primaryButtonText: { fontSize: 15, fontWeight: '800', color: Colors.textOnPrimary },
  secondaryButton: { minHeight: 52, marginTop: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, secondaryButtonText: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  testBadge: { fontSize: 9, fontWeight: '900', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  note: { marginTop: 12, fontSize: 11, lineHeight: 17, color: Colors.textMuted },
});
