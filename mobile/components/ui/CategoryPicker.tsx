import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './colors';
import type { Category } from '@/services/inventory';

type Props = {
  value: string;
  onChange: (v: string) => void;
  categories: Category[];
};

export default function CategoryPicker({ value, onChange, categories }: Props) {
  const [open, setOpen] = useState(false);

  function select(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !value && { color: Colors.textMuted }]}>
          {value || 'Select category'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Category</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No categories yet.</Text>
                <Text style={styles.emptyHint}>Add some in Settings → Manage Categories.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
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
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  emptyBox: { paddingVertical: 32, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  emptyHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  noneRow: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowText: { fontSize: 15, color: Colors.textDark },
});
