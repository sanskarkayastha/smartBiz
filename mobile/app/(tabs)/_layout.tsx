import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/components/ui/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color }) => <Ionicons name="layers-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          tabBarLabel: 'Sales',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
