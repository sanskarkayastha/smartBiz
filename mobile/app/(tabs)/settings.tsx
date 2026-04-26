import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/onboarding');
  };

  const MENU_ITEMS = [
    { icon: 'person-outline' as const, label: 'Edit Profile', chevron: true, onPress: () => {} },
    { icon: 'language-outline' as const, label: 'Language', chevron: true, onPress: () => {} },
    { icon: 'log-out-outline' as const, label: 'Logout', chevron: false, onPress: handleLogout },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
        <View>
          <Text style={styles.name}>{user?.fullName ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            style={[styles.menuRow, index < MENU_ITEMS.length - 1 && styles.menuBorder]}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon} size={20} color={item.label === 'Logout' ? Colors.danger : Colors.textDark} />
              <Text style={[styles.menuLabel, item.label === 'Logout' && { color: Colors.danger }]}>
                {item.label}
              </Text>
            </View>
            {item.chevron && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, paddingHorizontal: 16, paddingVertical: 14 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  menuCard: { backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: Colors.textDark, fontWeight: '500' },
});
