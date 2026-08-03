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
    marginHorizontal: 16,
    paddingHorizontal: 4,
    gap: 4,
    marginBottom: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: Colors.cardMuted,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: 'transparent',
    borderWidth: 0,
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
