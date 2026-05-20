import { Pressable, StyleSheet, Animated, ViewStyle, Alert, Modal, View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Colors } from './colors';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // not available in Expo Go
}

type Props = {
  onResult: (text: string) => void;
  size?: number;
  style?: ViewStyle;
  color?: string;
};

export default function VoiceButton({ onResult, size = 22, style, color = Colors.primary }: Props) {
  const [recording, setRecording] = useState(false);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // wire up speech events when native module available
  if (useSpeechRecognitionEvent) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('result', (event: any) => {
      const transcript = event?.results?.[0]?.transcript ?? '';
      if (transcript) {
        stopRecording();
        onResult(transcript);
      }
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('error', () => {
      stopRecording();
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('end', () => {
      setRecording(false);
      stopPulse();
    });
  }

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulse.setValue(1);
  };

  const stopRecording = () => {
    setRecording(false);
    stopPulse();
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch {}
  };

  const handlePress = async () => {
    if (!ExpoSpeechRecognitionModule) {
      setFallbackText('');
      setFallbackVisible(true);
      return;
    }

    if (recording) {
      stopRecording();
      return;
    }

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone permission is needed for voice input.');
        return;
      }
      setRecording(true);
      startPulse();
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false });
    } catch {
      setRecording(false);
      stopPulse();
      Alert.alert('Error', 'Could not start voice recognition.');
    }
  };

  useEffect(() => {
    return () => {
      pulseLoop.current?.stop();
      try { ExpoSpeechRecognitionModule?.stop(); } catch {}
    };
  }, []);

  return (
    <>
      <Pressable onPress={handlePress} style={style}>
        <Animated.View style={[styles.btn, { transform: [{ scale: pulse }] }, recording && styles.btnActive]}>
          <Ionicons name={recording ? 'stop' : 'mic'} size={size} color={recording ? '#fff' : color} />
        </Animated.View>
      </Pressable>

      {/* Fallback modal for Expo Go */}
      <Modal visible={fallbackVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Voice Input</Text>
            <Text style={styles.dialogSub}>Voice recognition requires a development build. Type your input instead:</Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="e.g. Add 20 laptops at 75000 each"
              placeholderTextColor={Colors.textMuted}
              value={fallbackText}
              onChangeText={setFallbackText}
              multiline
              autoFocus
            />
            <View style={styles.dialogRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setFallbackVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, !fallbackText.trim() && { opacity: 0.5 }]}
                disabled={!fallbackText.trim()}
                onPress={() => { setFallbackVisible(false); onResult(fallbackText.trim()); }}
              >
                <Text style={styles.submitText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  btnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: '100%', gap: 12 },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  dialogSub: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  dialogInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.textDark, minHeight: 80, textAlignVertical: 'top' },
  dialogRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  submitText: { fontSize: 14, color: Colors.textOnPrimary, fontWeight: '700' },
});
