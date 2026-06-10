import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import InputField from '@/components/ui/InputField';
import { Colors } from '@/components/ui/colors';

export default function Register() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleEnabled = process.env.EXPO_PUBLIC_GOOGLE_SIGNIN_ENABLED === 'true';

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await register(email.trim(), password, fullName.trim());
      router.replace({ pathname: '/verify-email', params: { email: result.email } });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start managing your business with SmartBiz</Text>

        <View style={styles.form}>
          {googleEnabled ? (
            <Pressable
              style={({ pressed }) => [styles.googleBtn, (googleLoading || loading) && styles.btnDisabled, pressed && { opacity: 0.82 }]}
              onPress={handleGoogleSignup}
              disabled={googleLoading || loading}
            >
              {googleLoading
                ? <ActivityIndicator color={Colors.textDark} />
                : <Text style={styles.googleBtnText}>Continue with Google</Text>}
            </Pressable>
          ) : null}
          <InputField
            label="Full Name"
            placeholder="Roshan Thapa"
            value={fullName}
            onChangeText={setFullName}
          />
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
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Pressable style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.82 }]} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.textOnPrimary} />
            : <Text style={styles.btnText}>Create Account</Text>}
        </Pressable>

        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.link}>Already have an account? <Text style={{ color: Colors.primary }}>Log in</Text></Text>
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
  link: { textAlign: 'center', fontSize: 14, color: Colors.textMuted },
});
