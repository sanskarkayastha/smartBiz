import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { salesService, type EsewaMerchantSettings } from '@/services/sales';

export default function EsewaSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<EsewaMerchantSettings | null>(null);
  const [productCode, setProductCode] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setSettings(await salesService.getEsewaSettings()); }
    catch { Alert.alert('Could not load eSewa settings'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!productCode.trim() || !accessKey.trim()) {
      Alert.alert('Merchant details required', 'Enter the product code and access key supplied by eSewa.');
      return;
    }
    setSaving(true);
    try {
      setSettings(await salesService.saveEsewaSettings(productCode, accessKey));
      setProductCode(''); setAccessKey('');
      Alert.alert('eSewa connected', 'You can now generate amount-filled QR payments from Sales.');
    } catch (error: any) { Alert.alert('Could not connect eSewa', error?.response?.data?.error ?? 'Please check the details and try again.'); }
    finally { setSaving(false); }
  };

  const disconnect = () => Alert.alert('Disconnect eSewa?', 'Pending counter payments must be resolved first.', [
    { text: 'Keep connected', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: async () => {
      try { await salesService.deleteEsewaSettings(); await load(); }
      catch (error: any) { Alert.alert('Could not disconnect', error?.response?.data?.error ?? 'Try again later.'); }
    } },
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.textDark} /></Pressable>
        <Text style={styles.title}>Receive with eSewa</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.statusBlock}>
          <View style={[styles.statusIcon, settings?.configured && styles.statusIconConnected]}>
            <Ionicons name={settings?.configured ? 'checkmark' : 'wallet-outline'} size={22} color={settings?.configured ? Colors.success : Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{settings?.environment === 'UAT' ? 'eSewa test mode is ready' : settings?.configured ? 'Merchant account connected' : 'Connect your merchant account'}</Text>
            <Text style={styles.statusCopy}>{settings?.configured ? `${settings.maskedProductCode} · ${settings.environment}` : 'Payments go directly to your own eSewa merchant account.'}</Text>
          </View>
        </View>

        <Text style={styles.help}>{settings?.environment === 'UAT' ? 'SmartBiz is using eSewa shared test credentials. No real money is transferred in this mode.' : 'Use the product code and access key issued to your shop by eSewa. The access key is encrypted before storage and is never shown again.'}</Text>
        <Text style={styles.label}>Merchant product code</Text>
        <TextInput style={styles.input} value={productCode} onChangeText={setProductCode} autoCapitalize="characters" placeholder="e.g. INTENT" placeholderTextColor={Colors.textMuted} />
        <Text style={styles.label}>Access key</Text>
        <TextInput style={styles.input} value={accessKey} onChangeText={setAccessKey} secureTextEntry autoCapitalize="none" placeholder={settings?.configured ? 'Enter a new key to replace it' : 'Paste the eSewa access key'} placeholderTextColor={Colors.textMuted} />
        <Pressable onPress={save} disabled={saving} style={[styles.save, saving && { opacity: 0.65 }]}>
          {saving ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.saveText}>{settings?.configured ? 'Replace merchant credentials' : 'Connect eSewa'}</Text>}
        </Pressable>
        {settings?.configured && settings.environment !== 'UAT' ? <Pressable onPress={disconnect} style={styles.disconnect}><Text style={styles.disconnectText}>Disconnect merchant account</Text></Pressable> : null}
        <Text style={styles.uat}>UAT mode is active. Switch to production only after eSewa issues live merchant credentials and the callback URL is publicly reachable over HTTPS.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.card }, title: { fontSize: 21, fontWeight: '800', color: Colors.textDark },
  content: { padding: 16, paddingBottom: 40 }, statusBlock: { flexDirection: 'row', gap: 13, alignItems: 'center', padding: 17, borderRadius: 18, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  statusIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, statusIconConnected: { backgroundColor: Colors.successLight },
  statusTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark }, statusCopy: { marginTop: 4, fontSize: 12, color: Colors.textMuted },
  help: { marginTop: 18, fontSize: 13, lineHeight: 20, color: Colors.textMuted }, label: { marginTop: 18, marginBottom: 6, fontSize: 12, fontWeight: '800', color: Colors.textDark },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, paddingHorizontal: 14, fontSize: 14, color: Colors.textDark },
  save: { minHeight: 52, marginTop: 22, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, saveText: { color: Colors.textOnPrimary, fontSize: 14, fontWeight: '800' },
  disconnect: { minHeight: 48, marginTop: 10, alignItems: 'center', justifyContent: 'center' }, disconnectText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
  uat: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: Colors.warningLight, color: Colors.textDark, fontSize: 11, lineHeight: 17 },
});
