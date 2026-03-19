import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { DEFAULT_STOPWATCH_COLOR } from '@/types/stopwatch';

// ─── Colors ───────────────────────────────────────────────────────────────────

const LIGHT = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF1F5',
  text: '#0F1923',
  textSecondary: '#5A6A7A',
  primary: '#1A7FD4',
  primaryMuted: 'rgba(26,127,212,0.10)',
  border: 'rgba(15,25,35,0.10)',
  inputBg: '#FFFFFF',
  placeholder: '#9AABB8',
};

const DARK = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceSecondary: '#21262D',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  primary: '#1A7FD4',
  primaryMuted: 'rgba(26,127,212,0.15)',
  border: 'rgba(230,237,243,0.10)',
  inputBg: '#21262D',
  placeholder: '#4A5568',
};

function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK : LIGHT;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
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

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function StopwatchModal() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { stopwatches, addStopwatch, renameStopwatch } = useStopwatch();

  const isEditing = Boolean(edit);
  const existing = isEditing ? stopwatches.find(sw => sw.id === edit) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(
    existing?.color ?? DEFAULT_STOPWATCH_COLOR
  );

  const handleCancel = () => {
    console.log('[StopwatchModal] Cancel pressed');
    router.back();
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEditing && edit) {
      console.log(`[StopwatchModal] Save rename: id=${edit}, name="${trimmed}", color="${selectedColor}"`);
      renameStopwatch(edit, trimmed, selectedColor);
    } else {
      console.log(`[StopwatchModal] Create stopwatch: name="${trimmed}", color="${selectedColor}"`);
      addStopwatch(trimmed, selectedColor);
    }
    router.back();
  };

  const handleSwatchPress = (hex: string, label: string) => {
    console.log(`[StopwatchModal] Color swatch pressed: ${label} (${hex})`);
    setSelectedColor(hex);
  };

  const title = isEditing ? 'Rename Stopwatch' : 'New Stopwatch';
  const submitLabel = isEditing ? 'Save' : 'Create';
  const canSubmit = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: C.surface,
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
              <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600' }}>
                {submitLabel}
              </Text>
            </Pressable>
          </View>

          {/* Input */}
          <View
            style={{
              backgroundColor: C.inputBg,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 12,
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

          <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28 }}>
            Give your stopwatch a descriptive name like "Morning Run" or "Sprint 1".
          </Text>

          {/* Color picker */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.textSecondary,
              paddingHorizontal: 4,
              marginBottom: 14,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Indicator Color
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              paddingHorizontal: 4,
            }}
          >
            {PALETTE.map((swatch) => {
              const isSelected = selectedColor === swatch.hex;
              return (
                <Pressable
                  key={swatch.hex}
                  onPress={() => handleSwatchPress(swatch.hex, swatch.label)}
                  accessibilityLabel={swatch.label}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: swatch.hex,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: isSelected ? '#ffffff' : 'transparent',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${swatch.hex}`
                      : '0 1px 3px rgba(0,0,0,0.15)',
                  })}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
