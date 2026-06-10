import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InputField from '@/components/ui/InputField';
import { Colors } from '@/components/ui/colors';

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendVerification } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!email.trim() || !code.trim()) {
      Alert.alert('Error', 'Please enter your email and the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email.trim(), code.trim());
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Verification failed. Please try again.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Enter your email first so we know where to send the code.');
      return;
    }
    setResending(true);
    try {
      const result = await resendVerification(email.trim());
      setEmail(result.email);
      Alert.alert('Code Sent', result.message);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Could not resend the code right now.';
      Alert.alert('Resend Failed', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Pressable onPress={() => router.replace('/login')} style={styles.back}>
          <Text style={styles.backText}>Back to login</Text>
        </Pressable>

        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code we sent before you can use your SmartBiz account.</Text>

        <View style={styles.form}>
          <InputField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Verification Code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.82 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textOnPrimary} />
            : <Text style={styles.btnText}>Verify & Continue</Text>}
        </Pressable>

        <Pressable onPress={handleResend} disabled={resending}>
          <Text style={styles.link}>{resending ? 'Sending a new code...' : 'Didn’t get it? Resend code'}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.card },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 16, left: 24 },
  backText: { fontSize: 15, color: Colors.primary },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.textDark, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.textMuted, marginBottom: 32 },
  form: { gap: 16, marginBottom: 24 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
