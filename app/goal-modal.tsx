import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/Colors';
import { Goal, getGoals, saveGoal, deleteGoal } from '@/utils/goal-storage';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';

// ─── Number Input ─────────────────────────────────────────────────────────────

import { TextInput } from 'react-native';

function NumberInput({
  label, value, onChange, min = 0, max = 999,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const C = useColors();
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  const handleChange = (t: string) => {
    setText(t);
    const n = parseInt(t, 10);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
  };

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: C.inputBg,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          width: 72,
          alignItems: 'center',
        }}
      >
        <TextInput
          value={text}
          onChangeText={handleChange}
          keyboardType="number-pad"
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: C.text,
            textAlign: 'center',
            paddingVertical: 10,
            paddingHorizontal: 8,
            width: '100%',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontVariant: ['tabular-nums'],
          }}
          maxLength={3}
        />
      </View>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function GoalModal() {
  const C = useColors();
  const router = useRouter();
  const { stopwatchId, stopwatchName } = useLocalSearchParams<{ stopwatchId: string; stopwatchName: string }>();

  const [goalType, setGoalType] = useState<'total' | 'lap'>('total');
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [existingGoal, setExistingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (!stopwatchId) return;
    console.log(`[GoalModal] Loading goals for stopwatchId=${stopwatchId}`);
    getGoals().then(goals => {
      const found = goals.find(g => g.stopwatchId === stopwatchId && g.type === goalType);
      if (found) {
        setExistingGoal(found);
        const totalSec = Math.floor(found.targetMs / 1000);
        setMinutes(Math.floor(totalSec / 60));
        setSeconds(totalSec % 60);
        console.log(`[GoalModal] Existing goal found: targetMs=${found.targetMs}`);
      } else {
        setExistingGoal(null);
      }
    });
  }, [stopwatchId, goalType]);

  const handleSave = async () => {
    if (!stopwatchId || !stopwatchName) return;
    const targetMs = (minutes * 60 + seconds) * 1000;
    if (targetMs === 0) return;

    const goal: Goal = {
      stopwatchId,
      stopwatchName,
      targetMs,
      type: goalType,
      createdAt: new Date().toISOString(),
    };

    console.log(`[GoalModal] Saving goal: stopwatchId=${stopwatchId}, type=${goalType}, targetMs=${targetMs}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveGoal(goal);
    router.back();
  };

  const handleDelete = () => {
    if (!stopwatchId) return;
    console.log(`[GoalModal] Delete goal pressed: stopwatchId=${stopwatchId}, type=${goalType}`);
    Alert.alert(
      'Delete Goal?',
      'This goal will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log(`[GoalModal] Delete goal confirmed: stopwatchId=${stopwatchId}, type=${goalType}`);
            await deleteGoal(stopwatchId, goalType);
            router.back();
          },
        },
      ]
    );
  };

  const canSave = (minutes * 60 + seconds) > 0;
  const displayName = stopwatchName ?? 'Stopwatch';

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
    <View style={{ flex: 1, backgroundColor: C.card }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            onPress={() => {
              console.log('[GoalModal] Cancel pressed');
              router.back();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500' }}>Cancel</Text>
          </Pressable>

          <Text style={{ fontSize: 17, fontWeight: '600', color: C.text }} numberOfLines={1}>
            {'Set Goal'}
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => ({ opacity: !canSave ? 0.4 : pressed ? 0.6 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.tint, fontWeight: '600' }}>Save</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        >
          {/* Stopwatch name */}
          <View
            style={{
              backgroundColor: C.background,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              padding: 14,
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
              Stopwatch
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
              {displayName}
            </Text>
          </View>

          {/* Goal type */}
          <Text style={sectionLabel}>Goal Type</Text>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.surfaceSecondary,
              borderRadius: 10,
              padding: 3,
              marginBottom: 24,
            }}
          >
            {(['total', 'lap'] as const).map(t => {
              const isActive = goalType === t;
              const label = t === 'total' ? 'Total Time' : 'Best Lap';
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    console.log(`[GoalModal] Goal type selected: ${t}`);
                    setGoalType(t);
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: isActive ? C.card : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10)' : undefined,
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '500', color: isActive ? C.text : C.textSecondary }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Target time */}
          <Text style={sectionLabel}>Target Time</Text>
          <View
            style={{
              backgroundColor: C.background,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              padding: 20,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <NumberInput label="Minutes" value={minutes} onChange={setMinutes} max={999} />
            <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
            <NumberInput label="Seconds" value={seconds} onChange={setSeconds} max={59} />
          </View>

          {/* Delete button if goal exists */}
          {existingGoal && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: C.dangerMuted,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingVertical: 14,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Trash2 size={16} color={C.danger} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.danger }}>Delete Goal</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
