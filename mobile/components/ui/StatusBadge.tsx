import { View, Text, StyleSheet } from 'react-native';
import { Colors } from './colors';

type Status = 'In Stock' | 'Low Stock' | 'Out of Stock';

const config: Record<Status, { bg: string; text: string }> = {
  'In Stock': { bg: Colors.successLight, text: Colors.success },
  'Low Stock': { bg: Colors.warningLight, text: Colors.warning },
  'Out of Stock': { bg: Colors.dangerLight, text: Colors.danger },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { bg, text } = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
