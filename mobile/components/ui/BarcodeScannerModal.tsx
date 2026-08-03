import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, type BarcodeType, useCameraPermissions } from 'expo-camera';
import { Colors } from './colors';
import ModalCloseButton from './ModalCloseButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (value: string, type: string) => void;
  title?: string;
  subtitle?: string;
};

const SUPPORTED_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'qr',
];

export default function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  title = 'Scan barcode or QR',
  subtitle = 'Point your camera at the code to scan it automatically.',
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const scanLockedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      scanLockedRef.current = false;
      setHasScanned(false);
    }
  }, [visible]);

  const handleScanned = (result: { data: string; type: string }) => {
    if (scanLockedRef.current) return;
    const value = result.data.trim();
    if (!value) return;

    scanLockedRef.current = true;
    setHasScanned(true);
    onScanned(value, result.type);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <ModalCloseButton onPress={onClose} />
          </View>

          {!permission?.granted ? (
            <View style={styles.permissionState}>
              <Ionicons name="scan-outline" size={36} color={Colors.primary} />
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionText}>
                Enable camera access to scan product barcodes and QR codes.
              </Text>
              <Pressable style={styles.permissionBtn} onPress={() => requestPermission()}>
                <Text style={styles.permissionBtnText}>Allow Camera</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: SUPPORTED_TYPES }}
                onBarcodeScanned={hasScanned ? undefined : handleScanned}
              />
              <View pointerEvents="none" style={styles.frameWrap}>
                <View style={styles.frame} />
                <Text style={styles.frameText}>Hold the code inside the frame</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    gap: 16,
    minHeight: '78%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
  },
  permissionState: {
    flex: 1,
    minHeight: 320,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
  },
  permissionText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  permissionBtn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  permissionBtnText: {
    color: Colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  cameraWrap: {
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: Colors.primary,
  },
  camera: {
    flex: 1,
  },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 24,
  },
  frame: {
    width: '82%',
    aspectRatio: 1.4,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.textOnPrimary,
    backgroundColor: 'transparent',
  },
  frameText: {
    color: Colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
