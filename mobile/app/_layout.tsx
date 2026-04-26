import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="add-product" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
