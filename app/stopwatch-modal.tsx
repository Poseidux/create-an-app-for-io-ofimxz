import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { useCategory } from '@/contexts/CategoryContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useColors } from '@/constants/Colors';
import { DEFAULT_STOPWATCH_COLOR, Lap, formatTime, getElapsedMs } from '@/types/stopwatch';
import { saveSession } from '@/utils/session-storage';
import { Flag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  ItemGoal,
  StopwatchGoalType,
  getGoalForItem,
  saveGoal,
  deleteGoalForItem,
  markGoalAchieved,
  markGoalMissed,
} from '@/utils/goal-storage';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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
  { label: 'Warm Red',    hex: '#FF6B6B' },
  { label: 'Coral',       hex: '#FF8E53' },
  { label: 'Peach',       hex: '#FFA94D' },
  { label: 'Yellow',      hex: '#FFD43B' },
  { label: 'Gold',        hex: '#F9C74F' },
  { label: 'Light Blue',  hex: '#74C0FC' },
  { label: 'Blue 1',      hex: '#4DABF7' },
  { label: 'Blue 2',      hex: '#339AF0' },
  { label: 'Blue 3',      hex: '#228BE6' },
  { label: 'Dark Blue',   hex: '#1971C2' },
  { label: 'Mint',        hex: '#69DB7C' },
  { label: 'Green 1',     hex: '#51CF66' },
  { label: 'Green 2',     hex: '#40C057' },
  { label: 'Forest',      hex: '#2F9E44' },
  { label: 'Lime',        hex: '#94D82D' },
  { label: 'Lavender',    hex: '#DA77F2' },
  { label: 'Purple 1',    hex: '#CC5DE8' },
  { label: 'Purple 2',    hex: '#BE4BDB' },
  { label: 'Hot Pink',    hex: '#F783AC' },
  { label: 'Crimson',     hex: '#E64980' },
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
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: hex,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isSelected ? 3 : isWhite ? 1 : 0,
        borderColor: isSelected ? '#007AFF' : isWhite ? '#C6C6C8' : 'transparent',
        boxShadow: isSelected
          ? `0 0 0 2px ${hex === '#FFFFFF' ? '#C6C6C8' : hex}`
          : isSelected
          ? `0 0 12px ${hex}60`
          : '0 1px 4px rgba(0,0,0,0.3)',
      }}
      scaleValue={0.88}
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
    </AnimatedPressable>
  );
}

// ─── Lap Row ──────────────────────────────────────────────────────────────────

interface LapRowProps {
  lap: Lap;
  isFastest: boolean;
  isSlowest: boolean;
  onLongPress: () => void;
}

function LapRow({ lap, isFastest, isSlowest, onLongPress }: LapRowProps) {
  const C = useColors();
  const lapTimeDisplay = formatTime(lap.lapTime);
  const splitTimeDisplay = formatTime(lap.splitTime);

  const rowBg = isFastest
    ? 'rgba(52,199,89,0.10)'
    : isSlowest
    ? 'rgba(255,59,48,0.10)'
    : 'transparent';

  const lapTimeColor = isFastest ? '#34C759' : isSlowest ? '#FF3B30' : C.text;
  const timerFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  return (
    <Pressable
      onLongPress={() => {
        console.log(`[StopwatchModal] Lap long press: lapNumber=${lap.lapNumber}`);
        onLongPress();
      }}
      delayLongPress={400}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: pressed ? C.surfaceSecondary : rowBg,
        borderRadius: 8,
        marginBottom: 2,
      })}
    >
      <View style={{ width: 32 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, lineHeight: 18 }}>
          {String(lap.lapNumber)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            fontFamily: timerFont,
            color: lapTimeColor,
            fontVariant: ['tabular-nums'],
            lineHeight: 20,
          }}
        >
          {lapTimeDisplay}
        </Text>
        {lap.note ? (
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 1, lineHeight: 15 }}>
            {lap.note}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 12,
          fontFamily: timerFont,
          color: C.textSecondary,
          fontVariant: ['tabular-nums'],
          lineHeight: 17,
        }}
      >
        {splitTimeDisplay}
      </Text>
    </Pressable>
  );
}

// ─── Goal Number Input ────────────────────────────────────────────────────────

function GoalNumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
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
      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 15 }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: C.surfaceSecondary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          width: 64,
          alignItems: 'center',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
        }}
      >
        <TextInput
          value={text}
          onChangeText={handleChange}
          keyboardType="number-pad"
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: C.text,
            textAlign: 'center',
            paddingVertical: 8,
            paddingHorizontal: 6,
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

const PRESET_DEFAULTS: Record<string, { name: string; color: string }> = {
  running:    { name: 'Running',    color: '#22c55e' },
  swimming:   { name: 'Swimming',   color: '#38bdf8' },
  cycling:    { name: 'Cycling',    color: '#fb923c' },
  workout:    { name: 'Workout',    color: '#f87171' },
  study:      { name: 'Study',      color: '#a78bfa' },
  meditation: { name: 'Meditation', color: '#2dd4bf' },
  sport:      { name: 'Sport',      color: '#fbbf24' },
};

const GOAL_TYPES: { value: StopwatchGoalType; label: string; description: string }[] = [
  { value: 'target_duration', label: 'Target Duration', description: 'Reach a specific total time' },
  { value: 'target_laps', label: 'Target Laps', description: 'Reach a specific lap count' },
  { value: 'beat_personal_best', label: 'Beat Personal Best', description: 'Finish under a specific time' },
];

export default function StopwatchModal() {
  const C = useColors();
  const router = useRouter();
  const { edit, preset, name: nameParam, color: colorParam } = useLocalSearchParams<{
    edit?: string;
    preset?: string;
    name?: string;
    color?: string;
  }>();
  const { stopwatches, addStopwatch, canAddStopwatch, renameStopwatch, addLap, updateNote, updateLapNote, resetStopwatch } = useStopwatch();
  const { categories, addCategory } = useCategory();
  const { isSubscribed } = useSubscription();

  const isEditing = Boolean(edit);
  const existing = isEditing ? stopwatches.find(sw => sw.id === edit) : undefined;

  const presetDefaults = preset ? (PRESET_DEFAULTS[preset] ?? null) : null;

  const [name, setName] = useState(
    existing?.name ?? presetDefaults?.name ?? (nameParam ? decodeURIComponent(nameParam) : '')
  );
  const [selectedColor, setSelectedColor] = useState(
    existing?.color ?? presetDefaults?.color ?? colorParam ?? DEFAULT_STOPWATCH_COLOR
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    existing?.category ?? 'all'
  );
  const [newCatName, setNewCatName] = useState('');

  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalType, setGoalType] = useState<StopwatchGoalType>('target_duration');
  const [goalHours, setGoalHours] = useState(0);
  const [goalMinutes, setGoalMinutes] = useState(30);
  const [goalSeconds, setGoalSeconds] = useState(0);
  const [goalLaps, setGoalLaps] = useState(10);
  const [goalName, setGoalName] = useState('');
  const [existingGoal, setExistingGoal] = useState<ItemGoal | null>(null);

  const [noteText, setNoteText] = useState(existing?.note ?? '');

  useEffect(() => {
    setNoteText(existing?.note ?? '');
  }, [existing?.note]);

  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isEditing || !existing) return;
    if (existing.isRunning) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 100);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isEditing, existing?.isRunning]);

  useEffect(() => {
    if (!edit) return;
    console.log(`[StopwatchModal] Loading goal for stopwatchId=${edit}`);
    getGoalForItem(edit).then(goal => {
      if (!goal) return;
      setExistingGoal(goal);
      setGoalEnabled(true);
      setGoalType(goal.goalType as StopwatchGoalType);
      setGoalName(goal.goalName ?? '');
      if (goal.goalType === 'target_laps' && goal.targetLaps != null) {
        setGoalLaps(goal.targetLaps);
      } else {
        const ms = goal.targetMs ?? goal.personalBestMs ?? 0;
        const totalSec = Math.floor(ms / 1000);
        setGoalHours(Math.floor(totalSec / 3600));
        setGoalMinutes(Math.floor((totalSec % 3600) / 60));
        setGoalSeconds(totalSec % 60);
      }
      console.log(`[StopwatchModal] Existing goal loaded: type=${goal.goalType}`);
    });
  }, [edit]);

  const handleCancel = () => {
    console.log('[StopwatchModal] Cancel pressed');
    router.back();
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cat = selectedCategoryId === 'all' ? undefined : selectedCategoryId;

    let stopwatchId: string;
    if (isEditing && edit) {
      console.log(`[StopwatchModal] Save rename: id=${edit}, name="${trimmed}", color="${selectedColor}", category="${cat}"`);
      renameStopwatch(edit, trimmed, selectedColor, cat);
      stopwatchId = edit;
    } else {
      if (!canAddStopwatch) {
        console.log('[StopwatchModal] Stopwatch limit reached, redirecting to paywall');
        router.push('/paywall');
        return;
      }
      console.log(`[StopwatchModal] Create stopwatch: name="${trimmed}", color="${selectedColor}", category="${cat}"`);
      stopwatchId = Math.random().toString(36).slice(2);
      addStopwatch(trimmed, selectedColor, cat);
      router.back();
      return;
    }

    if (goalEnabled) {
      let targetMs: number | undefined;
      let personalBestMs: number | undefined;
      let targetLaps: number | undefined;

      if (goalType === 'target_duration') {
        targetMs = (goalHours * 3600 + goalMinutes * 60 + goalSeconds) * 1000;
      } else if (goalType === 'beat_personal_best') {
        personalBestMs = (goalHours * 3600 + goalMinutes * 60 + goalSeconds) * 1000;
      } else if (goalType === 'target_laps') {
        targetLaps = goalLaps;
      }

      const goal: ItemGoal = {
        id: existingGoal?.id ?? Math.random().toString(36).slice(2),
        itemId: stopwatchId,
        itemName: trimmed,
        itemKind: 'stopwatch',
        goalType,
        goalName: goalName.trim() || undefined,
        targetMs,
        personalBestMs,
        targetLaps,
        status: existingGoal?.status ?? 'active',
        createdAt: existingGoal?.createdAt ?? new Date().toISOString(),
      };
      console.log(`[StopwatchModal] Saving goal: type=${goalType}, itemId=${stopwatchId}`);
      await saveGoal(goal);
    } else if (existingGoal) {
      console.log(`[StopwatchModal] Deleting goal for itemId=${stopwatchId}`);
      await deleteGoalForItem(stopwatchId);
    }

    router.back();
  };

  const handleSwatchPress = (hex: string, label: string) => {
    console.log(`[StopwatchModal] Color swatch pressed: ${label} (${hex})`);
    setSelectedColor(hex);
  };

  const handleCategoryPress = (id: string) => {
    console.log(`[StopwatchModal] Category chip pressed: ${id}`);
    setSelectedCategoryId(id);
  };

  const [pendingCatName, setPendingCatName] = useState<string | null>(null);

  const handleAddCategoryWithPending = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    console.log(`[StopwatchModal] Add category pressed: "${trimmed}"`);
    setPendingCatName(trimmed);
    await addCategory(trimmed);
    setNewCatName('');
  };

  React.useEffect(() => {
    if (!pendingCatName) return;
    const found = categories.find(c => c.name === pendingCatName && !c.isBuiltIn);
    if (found) {
      setSelectedCategoryId(found.id);
      setPendingCatName(null);
    }
  }, [categories, pendingCatName]);

  const handleLap = useCallback(() => {
    if (!existing || !edit) return;
    const elapsedMs = getElapsedMs(existing);
    const laps = existing.laps ?? [];
    const lastSplit = laps.length > 0 ? laps[laps.length - 1].splitTime : 0;
    const lapTime = elapsedMs - lastSplit;
    const lap: Lap = {
      id: Math.random().toString(36).slice(2),
      lapNumber: laps.length + 1,
      lapTime,
      splitTime: elapsedMs,
      timestamp: new Date().toISOString(),
    };
    console.log(`[StopwatchModal] Lap recorded: lapNumber=${lap.lapNumber}, lapTime=${lapTime}ms`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLap(edit, lap);
  }, [existing, edit, addLap]);

  const handleReset = useCallback(async () => {
    if (!existing || !edit) return;
    const elapsedMs = getElapsedMs(existing);
    console.log(`[StopwatchModal] Reset pressed: id=${edit}, totalTime=${elapsedMs}ms`);

    if (elapsedMs > 0) {
      const categoryName = existing.category
        ? (categories.find(c => c.id === existing.category)?.name ?? existing.category)
        : '';
      const session = {
        id: Math.random().toString(36).slice(2),
        stopwatchId: existing.id,
        stopwatchName: existing.name,
        category: categoryName,
        color: existing.color ?? DEFAULT_STOPWATCH_COLOR,
        totalTime: elapsedMs,
        laps: existing.laps ?? [],
        note: existing.note,
        startedAt: new Date(Date.now() - elapsedMs).toISOString(),
        endedAt: new Date().toISOString(),
      };
      console.log(`[StopwatchModal] Auto-saving session: id=${session.id}, totalTime=${elapsedMs}ms`);
      await saveSession(session);

      const goal = await getGoalForItem(edit);
      if (goal && goal.status === 'active') {
        const laps = existing.laps ?? [];
        let achieved = false;
        if (goal.goalType === 'target_duration' && goal.targetMs != null) {
          achieved = elapsedMs >= goal.targetMs;
        } else if (goal.goalType === 'target_laps' && goal.targetLaps != null) {
          achieved = laps.length >= goal.targetLaps;
        } else if (goal.goalType === 'beat_personal_best' && goal.personalBestMs != null) {
          achieved = elapsedMs <= goal.personalBestMs;
        }
        if (achieved) {
          console.log(`[StopwatchModal] Goal achieved for id=${edit}`);
          await markGoalAchieved(edit);
        } else {
          console.log(`[StopwatchModal] Goal missed for id=${edit}`);
          await markGoalMissed(edit);
        }
      }
    }

    resetStopwatch(edit);
  }, [existing, edit, resetStopwatch]);

  const handleLapLongPress = useCallback((lap: Lap) => {
    if (!edit) return;
    if (Platform.OS !== 'ios') return;
    console.log(`[StopwatchModal] Lap long press for note: lapNumber=${lap.lapNumber}`);
    Alert.prompt(
      `Lap ${lap.lapNumber} Note`,
      'Add a note for this lap',
      (text) => {
        if (text !== null) {
          console.log(`[StopwatchModal] Lap note saved: lapId=${lap.id}, note="${text}"`);
          updateLapNote(edit, lap.id, text);
        }
      },
      'plain-text',
      lap.note ?? ''
    );
  }, [edit, updateLapNote]);

  const title = isEditing ? 'Edit Stopwatch' : 'New Stopwatch';
  const submitLabel = isEditing ? 'Save' : 'Create';
  const canSubmit = name.trim().length > 0;
  const canAddCat = newCatName.trim().length > 0;

  const laps = existing?.laps ?? [];
  const fastestLap = laps.length >= 2 ? laps.reduce((a, b) => a.lapTime < b.lapTime ? a : b) : null;
  const slowestLap = laps.length >= 2 ? laps.reduce((a, b) => a.lapTime > b.lapTime ? a : b) : null;

  const sectionLabel = {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textTertiary,
    paddingHorizontal: 4,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 2.0,
    lineHeight: 17,
  };

  const swColor = existing?.color ?? DEFAULT_STOPWATCH_COLOR;
  const elapsedMs = existing ? getElapsedMs(existing) : 0;
  const timerDisplay = formatTime(elapsedMs);
  const timerFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  const goalTimeMs = (goalHours * 3600 + goalMinutes * 60 + goalSeconds) * 1000;
  const goalTimeValid = goalTimeMs > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* FIXED HEADER */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.divider,
          }}
        >
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500', lineHeight: 22 }}>
              Cancel
            </Text>
          </Pressable>

          <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, letterSpacing: -0.3, lineHeight: 22 }}>
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
            <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600', lineHeight: 22 }}>
              {submitLabel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* KEYBOARD AWARE SCROLL AREA */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 120,
          }}
        >
          {/* Live timer + lap controls (edit mode only) */}
          {isEditing && existing && (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                padding: 20,
                marginBottom: 24,
                alignItems: 'center',
                boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <Text
                style={{
                  fontSize: 60,
                  fontWeight: '800',
                  fontFamily: timerFont,
                  color: existing.isRunning ? swColor : C.text,
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -2.5,
                  marginBottom: 8,
                  lineHeight: 68,
                }}
              >
                {timerDisplay}
              </Text>

              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                onBlur={() => {
                  if (edit) {
                    console.log(`[StopwatchModal] Note saved via blur: "${noteText}"`);
                    updateNote(edit, noteText);
                  }
                }}
                placeholder="Add note…"
                placeholderTextColor={C.placeholder}
                multiline
                style={{
                  fontSize: 13,
                  color: C.text,
                  backgroundColor: C.surfaceSecondary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginBottom: 16,
                  minHeight: 36,
                  maxHeight: 72,
                  width: '100%',
                  lineHeight: 19,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <AnimatedPressable
                  onPress={handleLap}
                  disabled={!existing.isRunning}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: existing.isRunning ? `${swColor}18` : C.surfaceSecondary,
                    borderRadius: 12,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: existing.isRunning ? `${swColor}30` : C.border,
                    opacity: !existing.isRunning ? 0.4 : 1,
                  }}
                >
                  <Flag size={14} color={existing.isRunning ? swColor : C.textSecondary} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: existing.isRunning ? swColor : C.textSecondary,
                      lineHeight: 20,
                    }}
                  >
                    Lap
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleReset}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: C.dangerMuted,
                    borderRadius: 12,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: `${C.danger}30`,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.danger, lineHeight: 20 }}>
                    Reset &amp; Save
                  </Text>
                </AnimatedPressable>
              </View>

              {laps.length > 0 && (
                <View style={{ width: '100%', marginTop: 16 }}>
                  <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 10 }} />
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 }}>
                    <View style={{ width: 32 }}>
                      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', lineHeight: 15 }}>
                        #
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', lineHeight: 15 }}>
                        Lap Time
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', lineHeight: 15 }}>
                      Split
                    </Text>
                  </View>
                  {[...laps].reverse().map(lap => (
                    <LapRow
                      key={lap.id}
                      lap={lap}
                      isFastest={fastestLap?.id === lap.id}
                      isSlowest={slowestLap?.id === lap.id}
                      onLongPress={() => handleLapLongPress(lap)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Name Input */}
          <View
            style={{
              backgroundColor: C.surfaceSecondary,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 8,
              boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
            }}
          >
            <TextInput
              autoFocus={!isEditing}
              value={name}
              onChangeText={setName}
              placeholder="Stopwatch name"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={{
                fontSize: 17,
                color: C.text,
                paddingHorizontal: 4,
                paddingVertical: 4,
                minHeight: 44,
                margin: 0,
                lineHeight: 24,
              }}
            />
          </View>

          <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28, lineHeight: 19 }}>
            Give your stopwatch a descriptive name like "Morning Run" or "Sprint 1".
          </Text>

          {/* Category picker */}
          <Text style={sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}
            style={{ flexShrink: 0, marginBottom: 12 }}
          >
            {categories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <AnimatedPressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                  style={{
                    flexShrink: 0,
                    flexGrow: 0,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isSelected ? C.primary : C.surfaceSecondary,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: C.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isSelected ? '#0D0F14' : C.chipText, lineHeight: 20 }}>
                    {cat.name}
                  </Text>
                </AnimatedPressable>
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
                backgroundColor: C.surfaceSecondary,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
              }}
            >
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="New category..."
                placeholderTextColor={C.placeholder}
                returnKeyType="done"
                onSubmitEditing={handleAddCategoryWithPending}
                style={{ fontSize: 14, color: C.text, padding: 0, margin: 0, lineHeight: 20 }}
              />
            </View>
            <AnimatedPressable
              onPress={handleAddCategoryWithPending}
              disabled={!canAddCat}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: canAddCat ? C.primary : C.surfaceSecondary,
                opacity: canAddCat ? 1 : 0.5,
                boxShadow: canAddCat ? '0 0 20px rgba(0,212,255,0.35)' : undefined,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: canAddCat ? '#0D0F14' : C.textSecondary, lineHeight: 20 }}>
                Add
              </Text>
            </AnimatedPressable>
          </View>

          {/* Color picker — Primary */}
          <Text style={sectionLabel}>Indicator Color</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              paddingHorizontal: 4,
              marginBottom: 24,
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
              marginBottom: 28,
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

          {/* Goal hint — create mode only */}
          {!isEditing && (
            <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: 'center', lineHeight: 17 }}>
                Goals can be set after creating the stopwatch by long-pressing it
              </Text>
            </View>
          )}

          {/* Goal section (edit mode only) */}
          {isEditing && (
            <>
              <Text style={sectionLabel}>Goal</Text>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                  marginBottom: 8,
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                {/* Toggle row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    minHeight: 52,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 21 }}>
                      Add Goal
                    </Text>
                    <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
                      Track a target for this stopwatch
                    </Text>
                  </View>
                  <Switch
                    value={goalEnabled}
                    onValueChange={(v) => {
                      console.log(`[StopwatchModal] Goal toggle: ${v}`);
                      setGoalEnabled(v);
                    }}
                    trackColor={{ false: C.border, true: C.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {goalEnabled && (
                  <>
                    <View style={{ height: 1, backgroundColor: C.divider }} />

                    {/* Goal type selection */}
                    <View style={{ padding: 14, gap: 8 }}>
                      {GOAL_TYPES.map(gt => {
                        const isActive = goalType === gt.value;
                        return (
                          <AnimatedPressable
                            key={gt.value}
                            onPress={() => {
                              console.log(`[StopwatchModal] Goal type selected: ${gt.value}`);
                              setGoalType(gt.value);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              padding: 12,
                              borderRadius: 12,
                              backgroundColor: isActive ? `${C.primary}14` : C.surfaceSecondary,
                              borderWidth: 1,
                              borderColor: isActive ? `${C.primary}40` : 'transparent',
                            }}
                          >
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                borderWidth: 2,
                                borderColor: isActive ? C.primary : C.textSecondary,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isActive && (
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: C.primary,
                                  }}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: isActive ? C.primary : C.text, lineHeight: 20 }}>
                                {gt.label}
                              </Text>
                              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1, lineHeight: 17 }}>
                                {gt.description}
                              </Text>
                            </View>
                          </AnimatedPressable>
                        );
                      })}
                    </View>

                    <View style={{ height: 1, backgroundColor: C.divider }} />

                    {/* Goal name input */}
                    <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
                      <View
                        style={{
                          backgroundColor: C.surfaceSecondary,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: C.border,
                          paddingHorizontal: 12,
                          paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                          boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
                        }}
                      >
                        <TextInput
                          value={goalName}
                          onChangeText={(t) => {
                            console.log('[StopwatchModal] Goal name changed');
                            setGoalName(t);
                          }}
                          placeholder="Goal name (optional)"
                          placeholderTextColor={C.placeholder}
                          returnKeyType="done"
                          style={{ fontSize: 14, color: C.text, padding: 0, margin: 0, lineHeight: 20 }}
                        />
                      </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: C.divider, marginTop: 14 }} />

                    {/* Goal inputs */}
                    <View style={{ padding: 14 }}>
                      {(goalType === 'target_duration' || goalType === 'beat_personal_best') && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                          }}
                        >
                          <GoalNumberInput label="Hours" value={goalHours} onChange={setGoalHours} max={99} />
                          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 28 }}>:</Text>
                          <GoalNumberInput label="Min" value={goalMinutes} onChange={setGoalMinutes} max={59} />
                          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 28 }}>:</Text>
                          <GoalNumberInput label="Sec" value={goalSeconds} onChange={setGoalSeconds} max={59} />
                        </View>
                      )}
                      {goalType === 'target_laps' && (
                        <View style={{ alignItems: 'center' }}>
                          <GoalNumberInput label="Laps" value={goalLaps} onChange={setGoalLaps} min={1} max={999} />
                        </View>
                      )}
                      {goalEnabled && goalType !== 'target_laps' && !goalTimeValid && (
                        <Text style={{ fontSize: 12, color: C.danger, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
                          Enter a time greater than zero
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </View>
              <Text style={{ fontSize: 12, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 8, lineHeight: 17 }}>
                Goal status is checked when you reset the stopwatch.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
