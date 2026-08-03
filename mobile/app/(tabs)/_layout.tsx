import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/components/ui/colors';

export default function TabLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.card} />
      <Tabs
        screenOptions={{
          sceneStyle: {
            backgroundColor: Colors.background,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 76,
            paddingTop: 9,
            paddingBottom: 9,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarHideOnKeyboard: true,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={focused ? Colors.textOnPrimary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            tabBarLabel: 'Sales',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={20} color={focused ? Colors.textOnPrimary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            tabBarLabel: 'Inventory',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={focused ? 'cube' : 'cube-outline'} size={20} color={focused ? Colors.textOnPrimary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="crm"
          options={{
            tabBarLabel: 'CRM',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={focused ? 'people' : 'people-outline'} size={20} color={focused ? Colors.textOnPrimary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            tabBarLabel: 'More',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons name={focused ? 'grid' : 'grid-outline'} size={20} color={focused ? Colors.textOnPrimary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen name="customers" options={{ href: null }} />
        <Tabs.Screen name="leads" options={{ href: null }} />
        <Tabs.Screen name="suppliers" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
  },
});
