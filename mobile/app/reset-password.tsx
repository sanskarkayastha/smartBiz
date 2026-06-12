import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InputField from '@/components/ui/InputField';
import { Colors } from '@/components/ui/colors';

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim() || !code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in your email, code, and new password.');
      return;
    }
    if (code.trim().length !== 6) {
      Alert.alert('Error', 'Your reset code must be 6 digits.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'The new passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('Password Updated', result.message, [
        { text: 'Back to login', onPress: () => router.replace('/login') },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Could not reset your password right now.';
      Alert.alert('Reset Failed', msg);
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

        <Text style={styles.title}>Enter your OTP</Text>
        <Text style={styles.subtitle}>Use the 6-digit code from your email, then choose a new password for SmartBiz.</Text>

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
            label="Reset Code"
            placeholder="123456"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <InputField
            label="New Password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <InputField
            label="Confirm New Password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.82 }]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textOnPrimary} />
            : <Text style={styles.btnText}>Reset Password</Text>}
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
