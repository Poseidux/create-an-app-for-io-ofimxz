import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { useCategory } from '@/contexts/CategoryContext';
import { useColors } from '@/constants/Colors';
import { DEFAULT_STOPWATCH_COLOR } from '@/types/stopwatch';

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE_PRIMARY = [
  { label: 'Green',  hex: '#22c55e' },
  { label: 'Sky',    hex: '#38bdf8' },
  { label: 'Violet', hex: '#a78bfa' },
  { label: 'Rose',   hex: '#fb7185' },
  { label: 'Amber',  hex: '#fbbf24' },
  { label: 'Orange', hex: '#fb923c' },
  { label: 'Teal',   hex: '#2dd4bf' },
  { label: 'Indigo', hex: '#818cf8' },
  { label: 'Pink',   hex: '#f472b6' },
  { label: 'Red',    hex: '#f87171' },
];

const PALETTE_ADDITIONAL = [
  // Warm
  { label: 'Warm Red',    hex: '#FF6B6B' },
  { label: 'Coral',       hex: '#FF8E53' },
  { label: 'Peach',       hex: '#FFA94D' },
  { label: 'Yellow',      hex: '#FFD43B' },
  { label: 'Gold',        hex: '#F9C74F' },
  // Cool
  { label: 'Light Blue',  hex: '#74C0FC' },
  { label: 'Blue 1',      hex: '#4DABF7' },
  { label: 'Blue 2',      hex: '#339AF0' },
  { label: 'Blue 3',      hex: '#228BE6' },
  { label: 'Dark Blue',   hex: '#1971C2' },
  // Nature
  { label: 'Mint',        hex: '#69DB7C' },
  { label: 'Green 1',     hex: '#51CF66' },
  { label: 'Green 2',     hex: '#40C057' },
  { label: 'Forest',      hex: '#2F9E44' },
  { label: 'Lime',        hex: '#94D82D' },
  // Purple/Pink
  { label: 'Lavender',    hex: '#DA77F2' },
  { label: 'Purple 1',    hex: '#CC5DE8' },
  { label: 'Purple 2',    hex: '#BE4BDB' },
  { label: 'Hot Pink',    hex: '#F783AC' },
  { label: 'Crimson',     hex: '#E64980' },
  // Neutral/Dark
  { label: 'Silver',      hex: '#ADB5BD' },
  { label: 'Gray',        hex: '#868E96' },
  { label: 'Slate',       hex: '#495057' },
  { label: 'Charcoal',    hex: '#212529' },
  { label: 'White',       hex: '#FFFFFF' },
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({
  hex,
  label,
  isSelected,
  onPress,
  size = 36,
}: {
  hex: string;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  size?: number;
}) {
  const isWhite = hex === '#FFFFFF';
  const borderRadius = size / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius,
        backgroundColor: hex,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        borderWidth: isSelected ? 3 : isWhite ? 1 : 0,
        borderColor: isSelected ? '#007AFF' : isWhite ? '#C6C6C8' : 'transparent',
        boxShadow: isSelected
          ? `0 0 0 2px ${hex === '#FFFFFF' ? '#C6C6C8' : hex}`
          : '0 1px 3px rgba(0,0,0,0.15)',
      })}
    >
      {isSelected && (
        <View
          style={{
            width: size * 0.35,
            height: size * 0.35,
            borderRadius: size * 0.175,
            backgroundColor: isWhite ? '#007AFF' : '#ffffff',
          }}
        />
      )}
    </Pressable>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function StopwatchModal() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { stopwatches, addStopwatch, renameStopwatch } = useStopwatch();
  const { categories, addCategory } = useCategory();

  const isEditing = Boolean(edit);
  const existing = isEditing ? stopwatches.find(sw => sw.id === edit) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(
    existing?.color ?? DEFAULT_STOPWATCH_COLOR
  );
  const [selectedCategory, setSelectedCategoryState] = useState(
    existing?.category ?? 'all'
  );
  const [newCatName, setNewCatName] = useState('');

  const handleCancel = () => {
    console.log('[StopwatchModal] Cancel pressed');
    router.back();
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cat = selectedCategory === 'all' ? undefined : selectedCategory;

    if (isEditing && edit) {
      console.log(`[StopwatchModal] Save rename: id=${edit}, name="${trimmed}", color="${selectedColor}", category="${cat}"`);
      renameStopwatch(edit, trimmed, selectedColor, cat);
    } else {
      console.log(`[StopwatchModal] Create stopwatch: name="${trimmed}", color="${selectedColor}", category="${cat}"`);
      addStopwatch(trimmed, selectedColor, cat);
    }
    router.back();
  };

  const handleSwatchPress = (hex: string, label: string) => {
    console.log(`[StopwatchModal] Color swatch pressed: ${label} (${hex})`);
    setSelectedColor(hex);
  };

  const handleCategoryPress = (id: string) => {
    console.log(`[StopwatchModal] Category chip pressed: ${id}`);
    setSelectedCategoryState(id);
  };

  const [pendingCatName, setPendingCatName] = useState<string | null>(null);

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    console.log(`[StopwatchModal] Add category pressed: "${trimmed}"`);
    setPendingCatName(trimmed);
    await addCategory(trimmed);
    setNewCatName('');
  };

  // Once categories updates after addCategory, find the new one and auto-select it
  React.useEffect(() => {
    if (!pendingCatName) return;
    const found = categories.find(c => c.name === pendingCatName && !c.isBuiltIn);
    if (found) {
      setSelectedCategoryState(found.id);
      setPendingCatName(null);
    }
  }, [categories, pendingCatName]);

  const title = isEditing ? 'Edit Stopwatch' : 'New Stopwatch';
  const submitLabel = isEditing ? 'Save' : 'Create';
  const canSubmit = name.trim().length > 0;
  const canAddCat = newCatName.trim().length > 0;

  const sectionLabel = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.textSecondary,
    paddingHorizontal: 4,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: C.card,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 28,
            }}
          >
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
            >
              <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500' }}>
                Cancel
              </Text>
            </Pressable>

            <Text style={{ fontSize: 17, fontWeight: '600', color: C.text }}>
              {title}
            </Text>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                opacity: !canSubmit ? 0.4 : pressed ? 0.6 : 1,
                padding: 4,
              })}
            >
              <Text style={{ fontSize: 16, color: C.tint, fontWeight: '600' }}>
                {submitLabel}
              </Text>
            </Pressable>
          </View>

          {/* Name Input */}
          <View
            style={{
              backgroundColor: C.inputBg,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 8,
            }}
          >
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder="Stopwatch name"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={{
                fontSize: 17,
                color: C.text,
                padding: 0,
                margin: 0,
              }}
            />
          </View>

          <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 24 }}>
            Give your stopwatch a descriptive name like "Morning Run" or "Sprint 1".
          </Text>

          {/* Category picker */}
          <Text style={sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 12 }}
            style={{ flexShrink: 0 }}
          >
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              const chipBg = isSelected ? C.chipSelected : C.chipBackground;
              const chipTextColor = isSelected ? C.chipSelectedText : C.chipText;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                  style={({ pressed }) => ({
                    alignSelf: 'flex-start',
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: chipBg,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: chipTextColor }}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Inline add category */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 28,
              paddingHorizontal: 4,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: C.inputBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 8 : 4,
              }}
            >
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="New category..."
                placeholderTextColor={C.placeholder}
                returnKeyType="done"
                onSubmitEditing={handleAddCategory}
                style={{
                  fontSize: 14,
                  color: C.text,
                  padding: 0,
                  margin: 0,
                }}
              />
            </View>
            <Pressable
              onPress={handleAddCategory}
              disabled={!canAddCat}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: canAddCat ? C.tint : C.chipBackground,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: canAddCat ? '#fff' : C.subtext,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>

          {/* Color picker — Primary */}
          <Text style={sectionLabel}>Indicator Color</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              paddingHorizontal: 4,
              marginBottom: 20,
            }}
          >
            {PALETTE_PRIMARY.map((swatch) => (
              <ColorSwatch
                key={swatch.hex}
                hex={swatch.hex}
                label={swatch.label}
                isSelected={selectedColor === swatch.hex}
                onPress={() => handleSwatchPress(swatch.hex, swatch.label)}
                size={36}
              />
            ))}
          </View>

          {/* Color picker — Additional */}
          <Text style={sectionLabel}>Additional Colors</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              paddingHorizontal: 4,
            }}
          >
            {PALETTE_ADDITIONAL.map((swatch) => (
              <ColorSwatch
                key={swatch.hex}
                hex={swatch.hex}
                label={swatch.label}
                isSelected={selectedColor === swatch.hex}
                onPress={() => handleSwatchPress(swatch.hex, swatch.label)}
                size={32}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
