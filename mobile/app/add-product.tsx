import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '@/components/ui/colors';
import InputField from '@/components/ui/InputField';
import { inventoryService } from '@/services/inventory';

const CATEGORIES = ['Groceries', 'Footwear', 'Apparel', 'Accessories', 'Beauty', 'Beverage', 'Other'];

export default function AddProduct() {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [showCategories, setShowCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    const price = parseFloat(sellingPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid selling price');
      return;
    }
    setSaving(true);
    try {
      await inventoryService.createProduct({
        name: productName.trim(),
        category: category || undefined,
        price,
        quantity: stock,
      });
      Alert.alert('Product Saved!', `${productName} has been added to inventory.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to save product. Please try again.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Product</Text>
        <Pressable onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Photo Upload */}
        <Text style={styles.sectionLabel}>Product Photo</Text>
        <Pressable style={styles.photoBox}>
          <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.photoText}>Tap to upload photo</Text>
        </Pressable>

        {/* Details */}
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.fieldsGroup}>
          <InputField
            label="Product Name"
            placeholder="e.g. Wai Wai Noodles"
            value={productName}
            onChangeText={setProductName}
          />

          {/* Category dropdown */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Category</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowCategories(!showCategories)}
            >
              <Text style={[styles.dropdownText, !category && { color: Colors.textMuted }]}>
                {category || 'Select category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
            </Pressable>
            {showCategories && (
              <View style={styles.categoryList}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={styles.categoryItem}
                    onPress={() => { setCategory(cat); setShowCategories(false); }}
                  >
                    <Text style={[styles.categoryText, cat === category && { color: Colors.primary, fontWeight: '700' }]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Pricing & Inventory */}
        <Text style={styles.sectionLabel}>Pricing &amp; Inventory</Text>
        <View style={styles.fieldsGroup}>
          <View style={styles.row}>
            <InputField
              label="Cost Price"
              placeholder="Rs. 0"
              value={costPrice}
              onChangeText={setCostPrice}
              keyboardType="numeric"
            />
            <InputField
              label="Selling Price"
              placeholder="Rs. 0"
              value={sellingPrice}
              onChangeText={setSellingPrice}
              keyboardType="numeric"
            />
          </View>

          <View>
            <Text style={styles.fieldLabel}>Initial Stock</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setStock((s) => Math.max(0, s - 1))}>
                <Ionicons name="remove" size={20} color={Colors.textDark} />
              </Pressable>
              <Text style={styles.stockCount}>{stock}</Text>
              <Pressable style={[styles.stepBtn, styles.stepBtnActive]} onPress={() => setStock((s) => s + 1)}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Product</Text>
              </>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  scroll: { padding: 16, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
    marginTop: 8,
  },
  photoBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.card,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  photoText: { fontSize: 13, color: Colors.textMuted },
  fieldsGroup: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  fieldWrapper: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: Colors.textDark },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  dropdownText: { fontSize: 14, color: Colors.textDark },
  categoryList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    marginTop: 4,
  },
  categoryItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryText: { fontSize: 14, color: Colors.textDark },
  row: { flexDirection: 'row', gap: 12 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 6,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  stepBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stockCount: { fontSize: 20, fontWeight: '700', color: Colors.textDark, minWidth: 30, textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
