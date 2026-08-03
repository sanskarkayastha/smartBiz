import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './colors';

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  showFilter?: boolean;
  onFilterPress?: () => void;
  filterActive?: boolean;
};

export default function SearchBar({ placeholder = 'Search...', value, onChangeText, showFilter, onFilterPress, filterActive }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      {showFilter && (
        <Pressable onPress={onFilterPress} style={({ pressed }) => [styles.filterBtn, filterActive && styles.filterBtnActive, pressed && { opacity: 0.7 }]}>
          <Ionicons name="options-outline" size={20} color={filterActive ? Colors.primary : Colors.textDark} />
          {filterActive && <View style={styles.filterDot} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    minHeight: 46,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
  },
  filterBtn: {
    backgroundColor: Colors.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '08',
  },
  filterDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
});
