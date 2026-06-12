import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const PROTECTED = new Set(['(tabs)', 'add-product']);
const PUBLIC = new Set(['onboarding', 'login', 'register', 'verify-email', 'forgot-password', 'reset-password']);

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasHiddenSplash = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (hasHiddenSplash.current) return;
    hasHiddenSplash.current = true;
    void SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const first = segments[0] as string | undefined;
    if (!first) return;

    if (!user && PROTECTED.has(first)) {
      router.replace('/onboarding');
    } else if (user && PUBLIC.has(first)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="add-product" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
