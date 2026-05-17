import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Colors } from './colors';

type Props = {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
};

export default function FilterTabs({ tabs, active, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(tab)}
            style={({ pressed }) => [styles.tab, isActive && styles.activeTab, pressed && { opacity: 0.78 }]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]} numberOfLines={1}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  activeLabel: { color: Colors.textOnPrimary },
});
