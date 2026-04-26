import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ButtonWithRightIcon from '@/components/buttonWithRightIcon';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/components/ui/colors';

const image = require('@/assets/images/onboarding.png');

export default function OnBoarding() {
  const router = useRouter();
  const { user } = useAuth();

  if (user) {
    router.replace('/(tabs)');
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Language toggle */}
        <View style={styles.langRow}>
          <View style={styles.langPill}>
            <Text style={styles.langActive}>EN</Text>
            <Text style={styles.langSep}>|</Text>
            <Text style={styles.langInactive}>हिन्दी</Text>
          </View>
        </View>

        <View style={styles.imageContainer}>
          <Image source={image} style={styles.image} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerText}>Welcome to </Text>
            <Text style={[styles.headerText, { color: Colors.primary }]}>SmartBiz</Text>
          </View>
          <Text style={styles.subtitle}>
            Manage your inventory, track sales, and grow your business with ease.
          </Text>
          <Text style={styles.tagline}>Simplifying business for Nepal.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <ButtonWithRightIcon
            label="Create Account"
            icon="arrow-forward"
            onPress={() => router.push('/register')}
            primary
          />
          <ButtonWithRightIcon
            label="Login"
            onPress={() => router.push('/login')}
          />
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms &amp; Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  langRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langActive: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  langSep: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  langInactive: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  imageContainer: {
    width: '100%',
    height: 380,
    marginBottom: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#666',
    marginBottom: 6,
    lineHeight: 22,
  },
  tagline: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
  terms: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 14,
    textAlign: 'center',
  },
});
