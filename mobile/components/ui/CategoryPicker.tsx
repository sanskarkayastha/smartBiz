import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './colors';
import ModalCloseButton from './ModalCloseButton';
import type { Category } from '@/services/inventory';

type Props = {
  value: string;
  onChange: (v: string) => void;
  categories: Category[];
  onCreateCategory?: (name: string) => Promise<Category>;
};

export default function CategoryPicker({ value, onChange, categories, onCreateCategory }: Props) {
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function select(name: string) {
    onChange(name);
    setOpen(false);
  }

  function close() {
    setCreateError('');
    setOpen(false);
  }

  async function createCategory() {
    const name = newCategory.trim();
    if (!name || !onCreateCategory || creating) return;

    const existing = categories.find((category) => category.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      setNewCategory('');
      setCreateError('');
      select(existing.name);
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const created = await onCreateCategory(name);
      setNewCategory('');
      onChange(created.name);
      setOpen(false);
    } catch (error: any) {
      setCreateError(error?.response?.data?.error ?? 'Could not add this category.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !value && { color: Colors.textMuted }]}>
          {value || 'Select category'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Category</Text>
              <ModalCloseButton onPress={close} accessibilityLabel="Close category picker" />
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No categories yet.</Text>
                <Text style={styles.emptyHint}>
                  {onCreateCategory ? 'Create the first category below.' : 'Add categories from Settings.'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.categoryList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Pressable style={[styles.row, styles.noneRow]} onPress={() => select('')}>
                  <Text style={[styles.rowText, !value && { color: Colors.primary, fontWeight: '700' }]}>None</Text>
                  {!value && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </Pressable>
                {categories.map((cat) => (
                  <Pressable key={cat.id} style={styles.row} onPress={() => select(cat.name)}>
                    <Text style={[styles.rowText, cat.name === value && { color: Colors.primary, fontWeight: '700' }]}>
                      {cat.name}
                    </Text>
                    {cat.name === value && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {onCreateCategory && (
              <View style={styles.createSection}>
                <Text style={styles.createLabel}>Add category</Text>
                <View style={styles.createRow}>
                  <TextInput
                    value={newCategory}
                    onChangeText={(text) => {
                      setNewCategory(text);
                      if (createError) setCreateError('');
                    }}
                    onSubmitEditing={() => void createCategory()}
                    placeholder="e.g. Beverages"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="done"
                    style={styles.createInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add category"
                    onPress={() => void createCategory()}
                    disabled={creating || !newCategory.trim()}
                    style={({ pressed }) => [
                      styles.createButton,
                      (creating || !newCategory.trim()) && styles.createButtonDisabled,
                      pressed && styles.createButtonPressed,
                    ]}
                  >
                    {creating
                      ? <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                      : <Ionicons name="add" size={20} color={Colors.textOnPrimary} />}
                  </Pressable>
                </View>
                {createError ? <Text style={styles.createError}>{createError}</Text> : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  triggerText: { fontSize: 14, color: Colors.textDark },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '78%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  emptyBox: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  emptyHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  categoryList: { flexShrink: 1 },
  noneRow: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowText: { fontSize: 15, color: Colors.textDark },
  createSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginTop: 8,
    gap: 7,
  },
  createLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  createInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textDark,
    backgroundColor: Colors.backgroundAlt,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  createButtonDisabled: { opacity: 0.45 },
  createButtonPressed: { opacity: 0.78 },
  createError: { fontSize: 12, lineHeight: 17, color: Colors.danger },
});
