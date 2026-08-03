import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { cloudinaryImageUrl } from '@/services/inventory';
import { Colors } from './colors';

export default function ProductImageThumbnail({ imageUrl, backgroundColor }: {
  imageUrl?: string | null;
  backgroundColor: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!imageUrl || failedSrc === imageUrl) {
    return (
      <View style={[styles.image, { backgroundColor }]}>
        <Ionicons name="cube-outline" size={26} color={Colors.textDark} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: cloudinaryImageUrl(imageUrl, 144) }}
      style={styles.image}
      contentFit="cover"
      transition={120}
      onError={() => setFailedSrc(imageUrl)}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: 60, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
