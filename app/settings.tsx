import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategory } from '@/contexts/CategoryContext';
import { useColors } from '@/constants/Colors';
import { Trash2, Plus, ChevronLeft } from 'lucide-react-native';
import { BUILT_IN_CATEGORIES } from '@/utils/category-storage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AmbientBackground } from '@/components/AmbientBackground';

const PRESET_TEMPLATES = [
  { key: 'running',    name: 'Running',    color: '#22c55e' },
  { key: 'swimming',   name: 'Swimming',   color: '#38bdf8' },
  { key: 'cycling',    name: 'Cycling',    color: '#fb923c' },
  { key: 'workout',    name: 'Workout',    color: '#f87171' },
  { key: 'study',      name: 'Study',      color: '#a78bfa' },
  { key: 'meditation', name: 'Meditation', color: '#2dd4bf' },
  { key: 'sport',      name: 'Sport',      color: '#fbbf24' },
];

export default function SettingsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { categories, addCategory, deleteCategory } = useCategory();
  const { restorePurchases } = useSubscription();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const customCategories = categories.filter(c => !c.isBuiltIn);
  const builtInCategories = BUILT_IN_CATEGORIES;

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    console.log(`[SettingsScreen] Add category pressed: "${trimmed}"`);
    addCategory(trimmed);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    console.log(`[SettingsScreen] Delete category pressed: id=${id}, name="${name}"`);
    Alert.alert(
      'Delete Category?',
      `"${name}" will be removed. Stopwatches in this category won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[SettingsScreen] Delete category confirmed: id=${id}`);
            deleteCategory(id);
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    console.log('[SettingsScreen] Restore Purchases pressed');
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      console.log(`[SettingsScreen] Restore Purchases result: restored=${restored}`);
      if (restored) {
        Alert.alert('Purchases Restored', 'Your unlimited stopwatches are now active.');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases found.');
      }
    } catch (error) {
      console.log('[SettingsScreen] Restore Purchases error:', error);
      Alert.alert('Restore Failed', 'Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePresetTap = (preset: typeof PRESET_TEMPLATES[0]) => {
    console.log(`[SettingsScreen] Preset template tapped: ${preset.key}`);
    router.push(`/stopwatch-modal?preset=${preset.key}`);
  };

  const handleBack = () => {
    console.log('[SettingsScreen] Back button pressed');
    router.back();
  };

  const sectionLabelStyle = {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 2.0,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 28,
    lineHeight: 17,
  };

  const cardStyle = {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderCurve: 'continuous' as const,
    marginHorizontal: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
  };

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    minHeight: 52,
    paddingVertical: 14,
  };

  const separatorStyle = {
    height: 1,
    backgroundColor: C.divider,
    marginLeft: 16,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <AmbientBackground />
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: C.background,
          borderBottomWidth: 1,
          borderBottomColor: C.divider,
        }}
      >
        <View
          style={{
            height: 52,
            paddingHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <AnimatedPressable
            onPress={handleBack}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
            }}
          >
            <ChevronLeft size={24} color={C.primary} />
          </AnimatedPressable>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: C.text,
              letterSpacing: -0.3,
              lineHeight: 22,
            }}
          >
            Settings
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Appearance */}
        <Text style={sectionLabelStyle}>Appearance</Text>
        <View style={cardStyle}>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 23 }}>
              Dark Mode
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 20 }}>
              Always on
            </Text>
          </View>
        </View>

        {/* Preset Templates */}
        <Text style={sectionLabelStyle}>Preset Templates</Text>
        <View style={cardStyle}>
          {PRESET_TEMPLATES.map((preset, idx) => (
            <React.Fragment key={preset.key}>
              <AnimatedPressable
                onPress={() => handlePresetTap(preset)}
                style={rowStyle}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: preset.color,
                    marginRight: 14,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 23 }}>
                  {preset.name}
                </Text>
                <ChevronLeft
                  size={16}
                  color={C.textSecondary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </AnimatedPressable>
              {idx < PRESET_TEMPLATES.length - 1 && (
                <View style={separatorStyle} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Categories */}
        <Text style={sectionLabelStyle}>Categories</Text>

        {/* Built-in categories */}
        <View style={cardStyle}>
          {builtInCategories.map((cat, idx) => (
            <React.Fragment key={cat.id}>
              <View style={rowStyle}>
                <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 23 }}>
                  {cat.name}
                </Text>
                <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 18 }}>
                  Built-in
                </Text>
              </View>
              {idx < builtInCategories.length - 1 && (
                <View style={separatorStyle} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Custom categories */}
        {customCategories.length > 0 && (
          <>
            <Text
              style={{
                fontSize: 12,
                color: C.textSecondary,
                paddingHorizontal: 20,
                marginTop: 16,
                marginBottom: 8,
                fontWeight: '500',
                lineHeight: 17,
              }}
            >
              Custom
            </Text>
            <View style={cardStyle}>
              {customCategories.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <View style={rowStyle}>
                    <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 23 }}>
                      {cat.name}
                    </Text>
                    <AnimatedPressable
                      onPress={() => handleDeleteCategory(cat.id, cat.name)}
                      style={{ padding: 8 }}
                      scaleValue={0.85}
                    >
                      <Trash2 size={16} color={C.danger} />
                    </AnimatedPressable>
                  </View>
                  {idx < customCategories.length - 1 && (
                    <View style={separatorStyle} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* Add category */}
        <Text
          style={{
            fontSize: 12,
            color: C.textSecondary,
            paddingHorizontal: 20,
            marginTop: 16,
            marginBottom: 8,
            fontWeight: '500',
            lineHeight: 17,
          }}
        >
          Add Category
        </Text>
        <View
          style={{
            ...cardStyle,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          <TextInput
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Category name"
            placeholderTextColor={C.placeholder}
            returnKeyType="done"
            onSubmitEditing={handleAddCategory}
            style={{
              flex: 1,
              fontSize: 15,
              color: C.text,
              paddingVertical: Platform.OS === 'ios' ? 14 : 10,
              lineHeight: 23,
            }}
          />
          <AnimatedPressable
            onPress={() => {
              console.log(`[SettingsScreen] Add category button pressed: "${newCategoryName}"`);
              handleAddCategory();
            }}
            disabled={newCategoryName.trim().length === 0}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: newCategoryName.trim().length === 0 ? C.surfaceSecondary : C.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            scaleValue={0.88}
          >
            <Plus size={16} color={newCategoryName.trim().length === 0 ? C.textSecondary : '#0D0F14'} />
          </AnimatedPressable>
        </View>

        {/* Purchases */}
        <Text style={sectionLabelStyle}>Purchases</Text>
        <View style={cardStyle}>
          <AnimatedPressable
            onPress={handleRestorePurchases}
            disabled={isRestoring}
            style={{
              ...rowStyle,
              paddingVertical: 16,
              opacity: isRestoring ? 0.6 : 1,
            }}
          >
            <Text style={{ flex: 1, fontSize: 15, color: C.primary, lineHeight: 23 }}>
              Restore Purchases
            </Text>
            {isRestoring && (
              <ActivityIndicator size="small" color={C.primary} />
            )}
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
