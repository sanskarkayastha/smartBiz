import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InputField from '@/components/ui/InputField';
import { Colors } from '@/components/ui/colors';

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleEnabled = process.env.EXPO_PUBLIC_GOOGLE_SIGNIN_ENABLED === 'true';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.error ?? 'Invalid email or password';
      if (code === 'EMAIL_NOT_VERIFIED') {
        Alert.alert('Verify Your Email', msg, [
          {
            text: 'Open Verification',
            onPress: () => router.push({ pathname: '/verify-email', params: { email: email.trim() } }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Google Sign-In Failed', err?.message ?? 'Could not complete Google sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to your SmartBiz account</Text>

        <View style={styles.form}>
          {googleEnabled ? (
            <Pressable
              style={({ pressed }) => [styles.googleBtn, (googleLoading || loading) && styles.btnDisabled, pressed && { opacity: 0.82 }]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading
                ? <ActivityIndicator color={Colors.textDark} />
                : <Text style={styles.googleBtnText}>Continue with Google</Text>}
            </Pressable>
          ) : null}
          <InputField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            placeholder="••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}>
            <Text style={styles.helperLink}>Forgot password?</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.82 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textOnPrimary} />
            : <Text style={styles.btnText}>Log In</Text>}
        </Pressable>

        <Pressable onPress={() => router.replace('/onboarding')}>
          <Text style={styles.link}>Don&apos;t have an account? <Text style={{ color: Colors.primary }}>Create one</Text></Text>
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
  form: {
    gap: 16,
    marginBottom: 24,
  },
  googleBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  googleBtnText: { color: Colors.textDark, fontSize: 15, fontWeight: '700' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  helperLink: { textAlign: 'right', fontSize: 14, color: Colors.primary, fontWeight: '600' },
  link: { textAlign: 'center', fontSize: 14, color: Colors.textMuted },
});
