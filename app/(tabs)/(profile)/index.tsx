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
import { Trash2, Plus, Settings } from 'lucide-react-native';
import { BUILT_IN_CATEGORIES } from '@/utils/category-storage';
import { useSubscription } from '@/contexts/SubscriptionContext';

// ─── Preset Templates ─────────────────────────────────────────────────────────

const PRESET_TEMPLATES = [
  { key: 'running',    emoji: '🏃', name: 'Running',    color: '#22c55e' },
  { key: 'swimming',   emoji: '🏊', name: 'Swimming',   color: '#38bdf8' },
  { key: 'cycling',    emoji: '🚴', name: 'Cycling',    color: '#fb923c' },
  { key: 'workout',    emoji: '💪', name: 'Workout',    color: '#f87171' },
  { key: 'study',      emoji: '📚', name: 'Study',      color: '#a78bfa' },
  { key: 'meditation', emoji: '🧘', name: 'Meditation', color: '#2dd4bf' },
  { key: 'sport',      emoji: '⚽', name: 'Sport',      color: '#fbbf24' },
];

export default function ProfileScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { categories, addCategory, deleteCategory } = useCategory();
  const { restorePurchases, isSubscribed } = useSubscription();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const customCategories = categories.filter(c => !c.isBuiltIn);
  const builtInCategories = BUILT_IN_CATEGORIES;

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    console.log(`[ProfileScreen] Add category pressed: "${trimmed}"`);
    addCategory(trimmed);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    console.log(`[ProfileScreen] Delete category pressed: id=${id}, name="${name}"`);
    Alert.alert(
      'Delete Category?',
      `"${name}" will be removed. Stopwatches in this category won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[ProfileScreen] Delete category confirmed: id=${id}`);
            deleteCategory(id);
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    console.log('[ProfileScreen] Restore Purchases pressed');
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      console.log(`[ProfileScreen] Restore Purchases result: restored=${restored}`);
      if (restored) {
        Alert.alert('Purchases Restored', 'Your unlimited stopwatches are now active.');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases found.');
      }
    } catch (error) {
      console.log('[ProfileScreen] Restore Purchases error:', error);
      Alert.alert('Restore Failed', 'Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePresetTap = (preset: typeof PRESET_TEMPLATES[0]) => {
    console.log(`[ProfileScreen] Preset template tapped: ${preset.key}`);
    router.push(`/stopwatch-modal?preset=${preset.key}`);
  };

  const sectionLabelStyle = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.subtext,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 28,
  };

  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    borderCurve: 'continuous' as const,
    marginHorizontal: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: C.border,
  };

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 13,
  };

  const separatorStyle = {
    height: 1,
    backgroundColor: C.separator,
    marginLeft: 16,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: C.background,
          borderBottomWidth: 1,
          borderBottomColor: C.separator,
        }}
      >
        <View
          style={{
            height: 44,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 36 }} />
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: C.text,
            }}
          >
            Profile
          </Text>
          <Pressable
            onPress={() => {
              console.log('[ProfileScreen] Settings gear icon pressed');
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Settings size={20} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Appearance */}
        <Text style={sectionLabelStyle}>Appearance</Text>
        <View style={cardStyle}>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize: 16, color: C.text }}>Dark Mode</Text>
            <Text style={{ fontSize: 14, color: C.subtext }}>Always on</Text>
          </View>
        </View>

        {/* Preset Templates */}
        <Text style={sectionLabelStyle}>Preset Templates</Text>
        <View style={cardStyle}>
          {PRESET_TEMPLATES.map((preset, idx) => (
            <React.Fragment key={preset.key}>
              <Pressable
                onPress={() => handlePresetTap(preset)}
                style={({ pressed }) => ({
                  ...rowStyle,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 18, marginRight: 12 }}>{preset.emoji}</Text>
                <Text style={{ flex: 1, fontSize: 16, color: C.text }}>
                  {preset.name}
                </Text>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: preset.color,
                  }}
                />
              </Pressable>
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
                <Text style={{ flex: 1, fontSize: 16, color: C.text }}>
                  {cat.name}
                </Text>
                <Text style={{ fontSize: 13, color: C.subtext }}>
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
                fontSize: 13,
                color: C.subtext,
                paddingHorizontal: 16,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Custom
            </Text>
            <View style={cardStyle}>
              {customCategories.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <View style={rowStyle}>
                    <Text style={{ flex: 1, fontSize: 16, color: C.text }}>
                      {cat.name}
                    </Text>
                    <Pressable
                      onPress={() => handleDeleteCategory(cat.id, cat.name)}
                      style={({ pressed }) => ({
                        padding: 6,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Trash2 size={16} color={C.destructive} />
                    </Pressable>
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
            fontSize: 13,
            color: C.subtext,
            paddingHorizontal: 16,
            marginTop: 16,
            marginBottom: 8,
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
              fontSize: 16,
              color: C.text,
              paddingVertical: Platform.OS === 'ios' ? 12 : 8,
            }}
          />
          <Pressable
            onPress={() => {
              console.log(`[ProfileScreen] Add category button pressed: "${newCategoryName}"`);
              handleAddCategory();
            }}
            disabled={newCategoryName.trim().length === 0}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: newCategoryName.trim().length === 0 ? C.chipBackground : C.tint,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Plus size={16} color={newCategoryName.trim().length === 0 ? C.subtext : '#fff'} />
          </Pressable>
        </View>

        {/* Purchases */}
        <Text style={sectionLabelStyle}>Purchases</Text>
        <View style={cardStyle}>
          <Pressable
            onPress={handleRestorePurchases}
            disabled={isRestoring}
            style={({ pressed }) => ({
              ...rowStyle,
              opacity: pressed || isRestoring ? 0.6 : 1,
            })}
          >
            <Text style={{ flex: 1, fontSize: 16, color: C.tint }}>
              Restore Purchases
            </Text>
            {isRestoring && (
              <ActivityIndicator size="small" color={C.tint} />
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
