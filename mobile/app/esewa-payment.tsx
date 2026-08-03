import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/components/ui/colors';
import { salesService, type PosPayment } from '@/services/sales';
import { markPosPaymentCompleted } from '@/services/paymentEvents';

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED']);
const ESEWA_INTENT_DEMO_URL = 'https://gitlab.com/esewa-pub/esewa-intent-payment-app';

export default function EsewaPayment() {
  const router = useRouter();
  const { paymentId, amount } = useLocalSearchParams<{ paymentId: string; amount: string }>();
  const [payment, setPayment] = useState<PosPayment | null>(null);
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(Date.now());

  const check = useCallback(async () => {
    if (!paymentId) return;
    try {
      const latest = await salesService.getEsewaPayment(paymentId);
      setPayment(latest);
      if (latest.status === 'SUCCEEDED') markPosPaymentCompleted(latest.paymentId);
    } catch {
      // Keep the QR visible during a temporary network interruption.
    } finally { setChecking(false); }
  }, [paymentId]);

  useEffect(() => { void check(); }, [check]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (payment && TERMINAL.has(payment.status)) return;
    const timer = setInterval(() => void check(), 2500);
    return () => clearInterval(timer);
  }, [payment, check]);

  const seconds = Math.max(0, Math.floor((new Date(payment?.expiresAt ?? Date.now()).getTime() - now) / 1000));
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const displayAmount = Number(payment?.amount ?? amount ?? 0).toLocaleString();
  const waiting = payment && ['BOOKED', 'PENDING'].includes(payment.status);
  const isUat = payment?.environment === 'UAT' || payment?.deeplink?.includes('rc-links.esewa.com.np');

  const cancel = () => Alert.alert('Cancel this payment?', 'SmartBiz will verify eSewa before releasing the reserved stock.', [
    { text: 'Keep waiting', style: 'cancel' },
    { text: 'Cancel payment', style: 'destructive', onPress: async () => {
      if (!paymentId) return;
      setChecking(true);
      try { setPayment(await salesService.cancelEsewaPayment(paymentId)); }
      catch (error: any) { Alert.alert('Could not cancel safely', error?.response?.data?.error ?? 'Use Check payment again.'); }
      finally { setChecking(false); }
    } },
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View><Text style={styles.kicker}>{isUat ? 'ESEWA TEST PAYMENT' : 'ESEWA PAYMENT'}</Text><Text style={styles.heading}>{isUat ? 'Scan with the test app' : 'Ask the buyer to scan'}</Text></View>
        {waiting ? <View style={styles.timer}><Text style={styles.timerText}>{countdown}</Text></View> : null}
      </View>

      <View style={styles.body}>
        {checking && !payment ? <ActivityIndicator size="large" color={Colors.primary} /> : null}
        {waiting && payment.qrPayload ? (
          <>
            <View style={styles.qrFrame}><QRCode value={payment.qrPayload} size={238} backgroundColor="#FDFEFF" color="#17243D" /></View>
            <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
            <Text style={styles.amount}>NPR {displayAmount}</Text>
            {isUat ? (
              <View style={styles.testNotice}>
                <Text style={styles.testTitle}>UAT QR</Text>
                <Text style={styles.testCopy}>The normal eSewa app cannot open this test QR. Install eSewa&apos;s Intent demo app, then scan this QR with the phone camera.</Text>
                <Pressable accessibilityRole="link" style={styles.testLink} onPress={() => Linking.openURL(ESEWA_INTENT_DEMO_URL)}>
                  <Text style={styles.testLinkText}>View official test app setup</Text>
                </Pressable>
              </View>
            ) : <Text style={styles.instruction}>Open eSewa, scan this code, and confirm the amount. This sale is recorded only after eSewa verifies payment.</Text>}
          </>
        ) : null}

        {payment?.status === 'SUCCEEDED' ? (
          <View style={styles.result}><View style={styles.successIcon}><Ionicons name="checkmark" size={44} color={Colors.textOnPrimary} /></View><Text style={styles.resultTitle}>Payment verified</Text><Text style={styles.resultCopy}>NPR {displayAmount} received. Stock and the sale are finalized.</Text></View>
        ) : null}
        {payment && ['FAILED', 'CANCELED', 'EXPIRED'].includes(payment.status) ? (
          <View style={styles.result}><View style={styles.failedIcon}><Ionicons name="close" size={40} color={Colors.danger} /></View><Text style={styles.resultTitle}>Payment not completed</Text><Text style={styles.resultCopy}>Reserved stock was released. Return to the cart to choose another payment method.</Text></View>
        ) : null}
        {payment?.status === 'REVIEW' ? (
          <View style={styles.result}><View style={styles.reviewIcon}><Ionicons name="alert" size={38} color={Colors.warning} /></View><Text style={styles.resultTitle}>Verification needs attention</Text><Text style={styles.resultCopy}>SmartBiz is keeping stock reserved until eSewa returns a safe final status. Do not collect a second payment.</Text></View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {waiting && payment.deeplink ? <Pressable style={styles.openButton} onPress={() => Linking.openURL(payment.deeplink!)}><Text style={styles.openText}>{isUat ? 'Open eSewa test payment' : 'Open eSewa on this phone'}</Text></Pressable> : null}
        {waiting || payment?.status === 'REVIEW' ? <Pressable style={styles.checkButton} onPress={check} disabled={checking}>{checking ? <ActivityIndicator color={Colors.textDark} /> : <Text style={styles.checkText}>Check payment</Text>}</Pressable> : null}
        {waiting ? <Pressable style={styles.cancelButton} onPress={cancel}><Text style={styles.cancelText}>Cancel safely</Text></Pressable> : null}
        {payment && TERMINAL.has(payment.status) ? <Pressable style={styles.openButton} onPress={() => router.back()}><Text style={styles.openText}>Return to Sales</Text></Pressable> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FD' }, top: { minHeight: 86, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 10, letterSpacing: 1.2, fontWeight: '900', color: Colors.primary }, heading: { marginTop: 4, fontSize: 22, fontWeight: '900', color: Colors.textDark },
  timer: { minWidth: 64, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.warningLight }, timerText: { textAlign: 'center', fontSize: 14, fontWeight: '900', color: Colors.textDark, fontVariant: ['tabular-nums'] },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }, qrFrame: { padding: 18, borderRadius: 24, backgroundColor: '#FDFEFF', borderWidth: 1, borderColor: Colors.border },
  amountLabel: { marginTop: 22, fontSize: 10, letterSpacing: 1.1, fontWeight: '900', color: Colors.textMuted }, amount: { marginTop: 4, fontSize: 31, fontWeight: '900', color: Colors.textDark },
  instruction: { marginTop: 12, maxWidth: 330, textAlign: 'center', fontSize: 13, lineHeight: 20, color: Colors.textMuted }, result: { alignItems: 'center', maxWidth: 330 },
  testNotice: { marginTop: 14, maxWidth: 350, width: '100%', borderRadius: 16, borderWidth: 1, borderColor: Colors.warning, backgroundColor: Colors.warningLight, padding: 14, alignItems: 'center' },
  testTitle: { fontSize: 11, letterSpacing: 1, fontWeight: '900', color: Colors.textDark },
  testCopy: { marginTop: 6, textAlign: 'center', fontSize: 13, lineHeight: 19, color: Colors.textDark },
  testLink: { marginTop: 8, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  testLinkText: { color: Colors.primary, fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
  successIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' }, failedIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  reviewIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center' }, resultTitle: { marginTop: 22, fontSize: 23, fontWeight: '900', color: Colors.textDark }, resultCopy: { marginTop: 9, textAlign: 'center', fontSize: 14, lineHeight: 21, color: Colors.textMuted },
  actions: { padding: 18, gap: 9 }, openButton: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, openText: { color: Colors.textOnPrimary, fontSize: 14, fontWeight: '800' },
  checkButton: { minHeight: 50, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }, checkText: { color: Colors.textDark, fontSize: 14, fontWeight: '800' },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
});
