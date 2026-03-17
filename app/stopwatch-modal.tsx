import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStopwatch } from '@/contexts/StopwatchContext';

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

  const handleCancel = () => {
    console.log('[StopwatchModal] Cancel pressed');
    router.back();
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEditing && edit) {
      console.log(`[StopwatchModal] Save rename: id=${edit}, name="${trimmed}"`);
      renameStopwatch(edit, trimmed);
    } else {
      console.log(`[StopwatchModal] Create stopwatch: name="${trimmed}"`);
      addStopwatch(trimmed);
    }
    router.back();
  };

  const title = isEditing ? 'Rename Stopwatch' : 'New Stopwatch';
  const submitLabel = isEditing ? 'Save' : 'Create';
  const canSubmit = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
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

        <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4 }}>
          Give your stopwatch a descriptive name like "Morning Run" or "Sprint 1".
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
