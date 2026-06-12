import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Colors } from '@/components/ui/colors';
import VoiceButton from '@/components/ui/VoiceButton';
import InvoiceScanModal from '@/components/ui/InvoiceScanModal';
import ImportSalesModal from '@/components/ui/ImportSalesModal';
import { inventoryService, type Product } from '@/services/inventory';
import { queryAi, getDailyInsight, type ChatMessage, type ParsedProduct, type ParsedSale } from '@/services/ai';

type Message = ChatMessage;
type AttachmentState = {
  type: 'image' | 'excel';
  label: string;
  image?: string;
  mimeType?: string;
  fileText?: string;
};

const QUICK_PROMPTS = [
  'Top selling products',
  'What to reorder?',
  'Revenue this week',
  'Best customers',
];

export default function AiScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hi! Ask me anything about your business — or attach an image or Excel file and tell me what to do with it.' },
  ]);
  const [input, setInput] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProducts, setScanProducts] = useState<ParsedProduct[] | null>(null);
  const [showSalesImportModal, setShowSalesImportModal] = useState(false);
  const [salesImportProducts, setSalesImportProducts] = useState<Product[]>([]);
  const [salesImportData, setSalesImportData] = useState<ParsedSale[] | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Android-only: manually track keyboard height to avoid edge-to-edge KAV issues
  const keyboardPad = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardPad, {
        toValue: e.endCoordinates.height,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardPad, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const fetchInsight = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const insight = await getDailyInsight();
      setMessages((prev) => [...prev, { role: 'ai', text: insight }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Could not load insight. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const pickAttachment = () => {
    Alert.alert('Attach File', 'Choose what to attach', [
      { text: 'Photo / Image', onPress: pickImage },
      { text: 'Excel / Spreadsheet', onPress: pickExcel },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setAttachment({
      type: 'image',
      label: 'Image',
      image: asset.base64 ?? undefined,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const pickExcel = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
      const wb = XLSX.read(base64, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csvText = XLSX.utils.sheet_to_csv(ws);
      setAttachment({ type: 'excel', label: asset.name ?? 'spreadsheet.xlsx', fileText: csvText });
    } catch {
      Alert.alert('Error', 'Could not read the Excel file. Please try a different file.');
    }
  };

  const send = async (text: string) => {
    const question = text.trim();
    const currentAttachment = attachment;
    if ((!question && !currentAttachment) || loading) return;

    setInput('');
    setInputKey((k) => k + 1);
    setAttachment(null);

    const displayText = question || `📎 ${currentAttachment!.label}`;
    const updatedMessages: Message[] = [...messages, { role: 'user', text: displayText }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const attachPayload = currentAttachment
        ? { image: currentAttachment.image, mimeType: currentAttachment.mimeType, fileText: currentAttachment.fileText }
        : undefined;
      const result = await queryAi(updatedMessages, attachPayload);
      setMessages((prev) => [...prev, { role: 'ai', text: result.response }]);
      if (result.products && result.products.length > 0) {
        setShowSalesImportModal(false);
        setSalesImportData(null);
        setScanProducts(result.products);
        setShowScanModal(true);
      }
      if (result.sales && result.sales.length > 0) {
        setShowScanModal(false);
        setScanProducts(null);
        try {
          const productsResponse = await inventoryService.getProducts(0, 1000);
          setSalesImportProducts(productsResponse.content);
          setSalesImportData(result.sales);
          setShowSalesImportModal(true);
        } catch {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: 'I found sales in that sheet, but I could not load inventory to review them right now.' },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const canSend = (!!input.trim() || !!attachment) && !loading;

  const content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <Text style={styles.headerSub}>Powered by Gemini</Text>
      </View>

      {/* Quick prompts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        <Pressable style={[styles.chip, styles.insightChip]} onPress={fetchInsight} disabled={loading}>
          <Ionicons name="sparkles" size={12} color={Colors.primary} />
          <Text style={styles.chipText}>Daily Insight</Text>
        </Pressable>
        {QUICK_PROMPTS.map((q) => (
          <Pressable key={q} style={styles.chip} onPress={() => send(q)}>
            <Text style={styles.chipText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {m.role === 'ai' && (
              <Ionicons name="sparkles" size={13} color={Colors.primary} style={styles.aiIcon} />
            )}
            <Text style={[styles.bubbleText, m.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
              {m.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Attachment chip */}
      {attachment && (
        <View style={styles.attachmentChip}>
          <Ionicons
            name={attachment.type === 'image' ? 'image-outline' : 'document-outline'}
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.attachmentLabel} numberOfLines={1}>{attachment.label}</Text>
          <Pressable onPress={() => setAttachment(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <Pressable style={styles.inputIconBtn} onPress={pickAttachment} disabled={loading}>
          <Ionicons name="attach" size={20} color={Colors.textMuted} />
        </Pressable>
        <VoiceButton onResult={(text) => setInput((prev) => prev ? prev + ' ' + text : text)} size={18} />
        <TextInput
          key={inputKey}
          style={styles.input}
          placeholder="Ask anything, or attach a file…"
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!canSend}
        >
          <Ionicons name="send" size={18} color={Colors.textOnPrimary} />
        </Pressable>
      </View>

      <InvoiceScanModal
        visible={showScanModal}
        initialProducts={scanProducts ?? undefined}
        onClose={() => { setShowScanModal(false); setScanProducts(null); }}
        onSaved={() => { setShowScanModal(false); setScanProducts(null); }}
      />
      <ImportSalesModal
        visible={showSalesImportModal}
        products={salesImportProducts}
        initialSales={salesImportData}
        onClose={() => {
          setShowSalesImportModal(false);
          setSalesImportData(null);
        }}
        onImported={() => {
          setShowSalesImportModal(false);
          setSalesImportData(null);
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: 'Historical sales were imported successfully.' },
          ]);
        }}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={80}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        <Animated.View style={[styles.flex, { paddingBottom: keyboardPad }]}>
          {content}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  headerSub: { fontSize: 11, color: Colors.textMuted },
  chips: { maxHeight: 44, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chipsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  aiBubble: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiIcon: { marginTop: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  aiBubbleText: { flex: 1, color: Colors.textDark },
  userBubbleText: { color: Colors.textOnPrimary },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  attachmentLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  inputIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textDark,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
