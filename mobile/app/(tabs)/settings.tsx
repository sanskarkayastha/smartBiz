import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const MENU_SECTIONS = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline' as const, label: 'Edit Profile', chevron: true, onPress: () => {} },
        { icon: 'lock-closed-outline' as const, label: 'Change Password', chevron: true, onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'language-outline' as const, label: 'Language', chevron: true, onPress: () => {} },
        { icon: 'notifications-outline' as const, label: 'Notifications', chevron: true, onPress: () => {} },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'log-out-outline' as const, label: 'Logout', chevron: false, danger: true, onPress: handleLogout },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.fullName ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>
        <Pressable style={styles.editIcon}>
          <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {MENU_SECTIONS.map((section, si) => (
        <View key={si} style={styles.sectionWrapper}>
          {section.title ? <Text style={styles.sectionLabel}>{section.title}</Text> : null}
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.label}
                style={[styles.menuRow, index < section.items.length - 1 && styles.menuBorder]}
                onPress={item.onPress}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconBox, item.danger && styles.menuIconBoxDanger]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.danger ? Colors.danger : Colors.primary}
                    />
                  </View>
                  <Text style={[styles.menuLabel, item.danger && { color: Colors.danger }]}>
                    {item.label}
                  </Text>
                </View>
                {item.chevron && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, paddingHorizontal: 16, paddingVertical: 14 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  profileInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  editIcon: { padding: 4 },
  sectionWrapper: { marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.6, marginHorizontal: 16, marginBottom: 6, textTransform: 'uppercase' },
  menuCard: { backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  menuIconBoxDanger: { backgroundColor: Colors.dangerLight },
  menuLabel: { fontSize: 15, color: Colors.textDark, fontWeight: '500' },
});
