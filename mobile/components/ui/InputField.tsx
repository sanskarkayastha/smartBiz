import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from './colors';

type Props = TextInputProps & {
  label: string;
};

export default function InputField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.textMuted}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textDark,
  },
});
