import { View, Text, Pressable, StyleSheet } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './ui/colors';

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
};

const ButtonWithRightIcon = ({ label, onPress, icon, primary }: Props) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && { opacity: 0.82 },
      ]}
    >
      <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
      {icon && (
        <Ionicons
          name={icon}
          size={24}
          color={primary ? Colors.textOnPrimary : Colors.textDark}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    width: 340,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.background,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  labelPrimary: {
    color: Colors.textOnPrimary,
  },
  labelSecondary: {
    color: Colors.textDark,
  },
});

export default ButtonWithRightIcon;
