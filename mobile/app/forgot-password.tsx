import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InputField from '@/components/ui/InputField';
import { Colors } from '@/components/ui/colors';

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      Alert.alert('Code Sent', result.message, [
        {
          text: 'Continue',
          onPress: () => router.replace({ pathname: '/reset-password', params: { email: result.email } }),
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Could not send a reset code right now.';
      Alert.alert('Request Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Pressable onPress={() => router.replace('/login')} style={styles.back}>
          <Text style={styles.backText}>Back to login</Text>
        </Pressable>

        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Enter your email and we&apos;ll send a 6-digit OTP to verify it&apos;s really you.</Text>

        <View style={styles.form}>
          <InputField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.82 }]}
          onPress={handleRequestReset}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textOnPrimary} />
            : <Text style={styles.btnText}>Send Reset Code</Text>}
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
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
