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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useCategory } from '@/contexts/CategoryContext';
import { useColors } from '@/constants/Colors';
import { Trash2, Plus, Check } from 'lucide-react-native';
import { BUILT_IN_CATEGORIES } from '@/utils/category-storage';

type ThemeOption = 'system' | 'light' | 'dark';

const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useThemeContext();
  const { categories, addCategory, deleteCategory } = useCategory();
  const [newCategoryName, setNewCategoryName] = useState('');

  const customCategories = categories.filter(c => !c.isBuiltIn);
  const builtInCategories = BUILT_IN_CATEGORIES;

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    console.log(`[Settings] Add category pressed: "${trimmed}"`);
    addCategory(trimmed);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    console.log(`[Settings] Delete category pressed: id=${id}, name="${name}"`);
    Alert.alert(
      'Delete Category?',
      `"${name}" will be removed. Stopwatches in this category won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[Settings] Delete category confirmed: id=${id}`);
            deleteCategory(id);
          },
        },
      ]
    );
  };

  const handleThemeSelect = (value: ThemeOption) => {
    console.log(`[Settings] Theme selected: ${value}`);
    setTheme(value);
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
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Appearance */}
        <Text style={sectionLabelStyle}>Appearance</Text>
        <View style={cardStyle}>
          {THEME_OPTIONS.map((opt, idx) => {
            const isSelected = theme === opt.value;
            return (
              <React.Fragment key={opt.value}>
                <Pressable
                  onPress={() => handleThemeSelect(opt.value)}
                  style={({ pressed }) => ({
                    ...rowStyle,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ flex: 1, fontSize: 16, color: C.text }}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Check size={18} color={C.tint} />
                  )}
                </Pressable>
                {idx < THEME_OPTIONS.length - 1 && (
                  <View style={separatorStyle} />
                )}
              </React.Fragment>
            );
          })}
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
            onPress={handleAddCategory}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
