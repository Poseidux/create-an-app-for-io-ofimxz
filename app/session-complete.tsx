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
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AmbientBackground } from '@/components/AmbientBackground';

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
      <AmbientBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 40,
          flexGrow: 1,
        }}
      >
        {/* ── Hero header ── */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          {/* Success icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(0,255,148,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 0 40px rgba(0,255,148,0.25), 0 0 80px rgba(0,255,148,0.10)',
            }}
          >
            <Check size={38} color={C.accent} strokeWidth={2.5} />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: C.text,
              marginBottom: 6,
              letterSpacing: -0.5,
              lineHeight: 34,
              textAlign: 'center',
            }}
          >
            Session Complete
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: C.textSecondary,
              marginBottom: 20,
              lineHeight: 23,
              textAlign: 'center',
            }}
          >
            {sessionName}
          </Text>

          {/* Duration — hero metric */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.borderGlow,
              paddingHorizontal: 32,
              paddingVertical: 16,
              alignItems: 'center',
              boxShadow: '0 0 30px rgba(0,212,255,0.15), 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: C.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 6,
              }}
            >
              Total Time
            </Text>
            <Text
              style={{
                fontSize: 52,
                fontWeight: '800',
                fontFamily: timerFont,
                color: C.primary,
                fontVariant: ['tabular-nums'],
                letterSpacing: -2,
                lineHeight: 60,
              }}
            >
              {durationDisplay}
            </Text>
          </View>
        </View>

        {/* ── Focus Rating ── */}
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 16,
            }}
          >
            How was your focus?
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(star => {
              const isFilled = star <= focusRating;
              return (
                <AnimatedPressable
                  key={star}
                  onPress={() => handleStarPress(star)}
                  scaleValue={0.85}
                >
                  <Star
                    size={36}
                    color={isFilled ? '#fbbf24' : C.border}
                    fill={isFilled ? '#fbbf24' : 'transparent'}
                    strokeWidth={1.5}
                  />
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* ── Note ── */}
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            marginBottom: 36,
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 12,
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
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: C.text,
              maxHeight: 80,
              textAlignVertical: 'top',
              lineHeight: 22,
            }}
          />
        </View>

        {/* ── Actions ── */}
        <View style={{ gap: 12 }}>
          <AnimatedPressable
            onPress={handleSave}
            style={{
              backgroundColor: C.primary,
              borderRadius: 16,
              height: 56,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(0,212,255,0.4), 0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#0D0F14', lineHeight: 22 }}>
              Save &amp; Done
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleSkip}
            style={{
              backgroundColor: C.surfaceSecondary,
              borderRadius: 16,
              height: 52,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.textSecondary, lineHeight: 22 }}>
              Skip
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
