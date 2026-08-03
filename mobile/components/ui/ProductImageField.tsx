import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './colors';

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export type SelectedProductImage = {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
};

type Props = {
  existingImageUrl?: string | null;
  selectedImage: SelectedProductImage | null;
  removed?: boolean;
  onSelect: (image: SelectedProductImage) => void;
  onRemove: () => void;
  disabled?: boolean;
};

function toSelectedImage(asset: ImagePicker.ImagePickerAsset): SelectedProductImage | null {
  const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();
  if (!ALLOWED_TYPES.has(mimeType)) {
    Alert.alert('Unsupported Image', 'Choose a JPEG, PNG, WebP, or HEIC image.');
    return null;
  }
  if (asset.fileSize != null && asset.fileSize > MAX_PRODUCT_IMAGE_BYTES) {
    Alert.alert('Image Too Large', 'Product images must be 5 MB or smaller.');
    return null;
  }
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return {
    uri: asset.uri,
    mimeType,
    fileName: asset.fileName ?? `product-${Date.now()}.${extension}`,
    fileSize: asset.fileSize,
  };
}

export default function ProductImageField({
  existingImageUrl,
  selectedImage,
  removed = false,
  onSelect,
  onRemove,
  disabled = false,
}: Props) {
  const displayUri = selectedImage?.uri ?? (!removed ? existingImageUrl : null);

  const chooseCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Camera permission is needed to take a product photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const image = toSelectedImage(result.assets[0]);
      if (image) onSelect(image);
    }
  };

  const chooseLibrary = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Photo library permission is needed to choose a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const image = toSelectedImage(result.assets[0]);
      if (image) onSelect(image);
    }
  };

  const chooseSource = () => {
    if (disabled) return;
    Alert.alert('Product Photo', 'Choose where to get the image.', [
      { text: 'Take Photo', onPress: () => void chooseCamera() },
      { text: 'Choose from Gallery', onPress: () => void chooseLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Pressable style={({ pressed }) => [styles.preview, pressed && styles.pressed]} onPress={chooseSource} disabled={disabled}>
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.image} contentFit="cover" transition={120} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={30} color={Colors.textMuted} />
            <Text style={styles.placeholderTitle}>Add product photo</Text>
            <Text style={styles.placeholderText}>Camera or gallery, up to 5 MB</Text>
          </View>
        )}
      </Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.changeButton} onPress={chooseSource} disabled={disabled}>
          <Ionicons name={displayUri ? 'images-outline' : 'add-circle-outline'} size={16} color={Colors.primary} />
          <Text style={styles.changeText}>{displayUri ? 'Change photo' : 'Choose photo'}</Text>
        </Pressable>
        {!!displayUri && (
          <Pressable style={styles.removeButton} onPress={onRemove} disabled={disabled}>
            <Ionicons name="trash-outline" size={15} color={Colors.danger} />
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  preview: {
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pressed: { opacity: 0.82 },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  placeholderTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  placeholderText: { fontSize: 12, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 10 },
  changeButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
  },
  changeText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  removeButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
  },
  removeText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
});
