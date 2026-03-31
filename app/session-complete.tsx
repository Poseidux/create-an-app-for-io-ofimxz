import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Check, Star } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { formatTime } from '@/types/stopwatch';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionCompletion {
  id: string;
  sessionName: string;
  durationMs: number;
  focusRating: number;
  note: string;
  completedAt: string;
  routineId?: string;
}

const COMPLETIONS_KEY = '@chroniqo_completions';

const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionComplete() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { duration, name, color, routineId } = useLocalSearchParams<{
    duration?: string;
    name?: string;
    color?: string;
    routineId?: string;
  }>();

  const durationMs = Number(duration ?? '0');
  const sessionName = name ?? 'Session';
  const sessionColor = color ?? C.primary;

  const [focusRating, setFocusRating] = useState(0);
  const [note, setNote] = useState('');

  const durationDisplay = formatTime(durationMs);

  const handleStarPress = (star: number) => {
    console.log(`[SessionComplete] Star rating selected: ${star}`);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setFocusRating(star);
  };

  const handleSave = async () => {
    console.log(`[SessionComplete] Save & Done pressed — rating=${focusRating}, note="${note}"`);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      const existing = await AsyncStorage.getItem(COMPLETIONS_KEY);
      const completions: SessionCompletion[] = existing ? JSON.parse(existing) : [];
      const entry: SessionCompletion = {
        id: generateId(),
        sessionName,
        durationMs,
        focusRating,
        note: note.trim(),
        completedAt: new Date().toISOString(),
        routineId: routineId ?? undefined,
      };
      completions.unshift(entry);
      await AsyncStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
      console.log(`[SessionComplete] Completion saved: ${entry.id}`);
    } catch (e) {
      console.warn('[SessionComplete] Failed to save completion:', e);
    }
    router.back();
  };

  const handleSkip = () => {
    console.log('[SessionComplete] Skip pressed');
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          flexGrow: 1,
        }}
      >
        {/* ── Header ── */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(52,199,89,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Check size={36} color="#34C759" strokeWidth={2.5} />
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: C.text,
              marginBottom: 6,
              letterSpacing: -0.3,
            }}
          >
            Session Complete
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: C.textSecondary,
              marginBottom: 16,
            }}
          >
            {sessionName}
          </Text>

          <Text
            style={{
              fontSize: 40,
              fontWeight: '800',
              fontFamily: timerFont,
              color: sessionColor,
              fontVariant: ['tabular-nums'],
              letterSpacing: -2,
            }}
          >
            {durationDisplay}
          </Text>
        </View>

        {/* ── Focus Rating ── */}
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.subtext,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 14,
            }}
          >
            How was your focus?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(star => {
              const isFilled = star <= focusRating;
              return (
                <Pressable
                  key={star}
                  onPress={() => handleStarPress(star)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Star
                    size={34}
                    color={isFilled ? '#fbbf24' : C.border}
                    fill={isFilled ? '#fbbf24' : 'transparent'}
                    strokeWidth={1.5}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Note ── */}
        <View style={{ marginBottom: 36 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.subtext,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Add a note (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What did you work on?"
            placeholderTextColor={C.placeholder}
            multiline
            style={{
              backgroundColor: C.surfaceSecondary,
              borderRadius: 14,
              padding: 14,
              fontSize: 15,
              color: C.text,
              maxHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* ── Actions ── */}
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              backgroundColor: C.primary,
              borderRadius: 16,
              paddingVertical: 17,
              width: '100%',
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              Save &amp; Done
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => ({
              backgroundColor: C.surfaceSecondary,
              borderRadius: 16,
              paddingVertical: 15,
              width: '100%',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.textSecondary }}>
              Skip
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
