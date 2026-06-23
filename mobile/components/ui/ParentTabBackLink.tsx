import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/components/ui/colors';

const PARENT_TAB_CONFIG = {
  crm: {
    label: 'CRM',
    href: '/(tabs)/crm' as const,
  },
  more: {
    label: 'More',
    href: '/(tabs)/more' as const,
  },
};

export default function ParentTabBackLink() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const parentSegment = segments[1];
  if (parentSegment !== 'crm' && parentSegment !== 'more') {
    return null;
  }

  const config = PARENT_TAB_CONFIG[parentSegment];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.replace(config.href)}
      >
        <Ionicons name="chevron-back" size={16} color={Colors.textOnPrimary} />
        <Text style={styles.buttonText}>{config.label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
});
