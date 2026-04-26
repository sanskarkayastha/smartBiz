import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Colors } from './colors';

type Props = {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
};

export default function FilterTabs({ tabs, active, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(tab)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textDark,
  },
  activeLabel: {
    color: '#fff',
  },
});
