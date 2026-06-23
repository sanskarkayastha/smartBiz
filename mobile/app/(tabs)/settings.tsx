import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '@/components/ui/colors';
import ParentTabBackLink from '@/components/ui/ParentTabBackLink';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { inventoryService, type Category } from '@/services/inventory';

export default function Settings() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    inventoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    try {
      const cat = await inventoryService.createCategory(name);
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to add category.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert('Delete Category', `Delete "${cat.name}"? Products with this label keep it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await inventoryService.deleteCategory(cat.id);
            setCategories((prev) => prev.filter((c) => c.id !== cat.id));
          } catch {
            Alert.alert('Error', 'Failed to delete category.');
          }
        },
      },
    ]);
  };

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

  const openEditProfile = () => {
    setProfileForm({ fullName: user?.fullName ?? '', phone: '' });
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.fullName.trim()) {
      Alert.alert('Validation', 'Name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      await authService.updateProfile(profileForm.fullName.trim(), profileForm.phone.trim() || undefined);
      await updateUser({ fullName: profileForm.fullName.trim() });
      setShowEditProfile(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
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
        { icon: 'person-outline' as const, label: 'Edit Profile', chevron: true, onPress: openEditProfile },
        { icon: 'lock-closed-outline' as const, label: 'Change Password', chevron: true, onPress: () => Alert.alert('Coming Soon', 'Password change will be available soon.') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'language-outline' as const, label: 'Language', chevron: true, onPress: () => Alert.alert('Coming Soon', 'Language support will be available soon.') },
        { icon: 'notifications-outline' as const, label: 'Notifications', chevron: true, onPress: () => Alert.alert('Coming Soon', 'Push notifications will be available soon.') },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { icon: 'grid-outline' as const, label: 'Manage Categories', chevron: true, onPress: () => setShowManageCategories(true) },
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
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ParentTabBackLink />
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.fullName ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>
        <Pressable style={styles.editIcon} onPress={openEditProfile}>
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

      {/* Manage Categories Modal */}
      <Modal visible={showManageCategories} animationType="slide" transparent onRequestClose={() => setShowManageCategories(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <Pressable onPress={() => setShowManageCategories(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={[styles.label, { color: Colors.textMuted, textAlign: 'center', marginTop: 8 }]}>No categories yet.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.catRow}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Pressable onPress={() => handleDeleteCategory(item)} style={styles.catDeleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Add Category</Text>
            <View style={styles.catAddRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. Electronics"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                onSubmitEditing={handleAddCategory}
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable
                style={[styles.saveBtn, { flex: 0, paddingHorizontal: 16, paddingVertical: 10, marginTop: 0, opacity: savingCategory || !newCategoryName.trim() ? 0.5 : 1 }]}
                onPress={handleAddCategory}
                disabled={savingCategory || !newCategoryName.trim()}
              >
                {savingCategory
                  ? <ActivityIndicator color={Colors.textOnPrimary} size="small" />
                  : <Ionicons name="add" size={22} color={Colors.textOnPrimary} />}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEditProfile} animationType="slide" transparent onRequestClose={() => setShowEditProfile(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={profileForm.fullName}
              onChangeText={(v) => setProfileForm((f) => ({ ...f, fullName: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 98XXXXXXXX"
              keyboardType="phone-pad"
              value={profileForm.phone}
              onChangeText={(v) => setProfileForm((f) => ({ ...f, phone: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Pressable
              style={[styles.saveBtn, savingProfile && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, paddingHorizontal: 16, paddingVertical: 14 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.textOnPrimary, fontWeight: 'bold', fontSize: 18 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textDark },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  catName: { flex: 1, fontSize: 15, color: Colors.textDark },
  catDeleteBtn: { padding: 6 },
  catAddRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
});

