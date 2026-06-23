import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/components/ui/colors';

export default function CrmLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.card} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="customers" />
        <Stack.Screen name="leads" />
      </Stack>
    </>
  );
}
