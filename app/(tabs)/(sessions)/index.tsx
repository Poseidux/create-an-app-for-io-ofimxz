import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  AlarmClock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Flag,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  X,
  Zap,
} from 'lucide-react-native';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { useCategory } from '@/contexts/CategoryContext';
import { useColors } from '@/constants/Colors';
import {
  DEFAULT_STOPWATCH_COLOR,
  formatTime,
  getElapsedMs,
  Lap,
  Stopwatch,
} from '@/types/stopwatch';
import { saveSession } from '@/utils/session-storage';
import {
  getGoals,
  ItemGoal,
  markGoalAchieved,
  markGoalMissed,
} from '@/utils/goal-storage';
import { deleteTimerConfig, getTimerConfigs, TimerConfig } from '@/utils/timer-storage';
import { loadTimerCategories } from '@/utils/timer-category-storage';

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'running', emoji: '🏃', name: 'Running', color: '#22c55e' },
  { key: 'swimming', emoji: '🏊', name: 'Swimming', color: '#38bdf8' },
  { key: 'cycling', emoji: '🚴', name: 'Cycling', color: '#fb923c' },
  { key: 'workout', emoji: '💪', name: 'Workout', color: '#f87171' },
  { key: 'study', emoji: '📚', name: 'Study', color: '#a78bfa' },
  { key: 'meditation', emoji: '🧘', name: 'Meditation', color: '#2dd4bf' },
  { key: 'sport', emoji: '⚽', name: 'Sport', color: '#fbbf24' },
];

// ─── Timer Runtime ────────────────────────────────────────────────────────────

interface TimerRuntime {
  configId: string;
  isRunning: boolean;
  phase: 'work' | 'rest' | 'countdown';
  currentRound: number;
  remainingMs: number;
  accumulatedMs: number;
  startedAt: number | null;
  isComplete: boolean;
}

function makeInitialRuntime(cfg: TimerConfig): TimerRuntime {
  const phase: 'work' | 'rest' | 'countdown' =
    cfg.mode === 'countdown' ? 'countdown' : 'work';
  const remainingMs =
    cfg.mode === 'countdown'
      ? (cfg.countdownMs ?? 60000)
      : (cfg.workMs ?? 60000);
  return {
    configId: cfg.id,
    isRunning: false,
    phase,
    currentRound: 1,
    remainingMs,
    accumulatedMs: 0,
    startedAt: null,
    isComplete: false,
  };
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity: anim,
        marginRight: 6,
      }}
    />
  );
}

// ─── Stopwatch Card ───────────────────────────────────────────────────────────

interface StopwatchCardProps {
  sw: Stopwatch;
  index: number;
  total: number;
  goal: ItemGoal | undefined;
  onLongPress: () => void;
  tick: number;
  onPlan: () => void;
}

function StopwatchCard({ sw, index, total, goal, onLongPress, tick: _tick, onPlan }: StopwatchCardProps) {
  const C = useColors();
  const router = useRouter();
  const {
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    deleteStopwatch,
    moveUp,
    moveDown,
    addLap,
  } = useStopwatch();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const elapsedMs = getElapsedMs(sw);
  const swColor = sw.color ?? DEFAULT_STOPWATCH_COLOR;
  const laps = sw.laps ?? [];
  const hasTime = elapsedMs > 0;

  const elapsedDisplay = formatTime(elapsedMs);
  const lapCount = laps.length;
  const lapCountLabel = lapCount > 0 ? `${lapCount} lap${lapCount !== 1 ? 's' : ''}` : null;

  const statusText = sw.isRunning ? 'Running' : hasTime ? 'Paused' : 'Ready';
  const statusColor = sw.isRunning ? '#22c55e' : hasTime ? '#fb923c' : C.textSecondary;

  const goalText = goal
    ? goal.status === 'achieved'
      ? '🏆 Goal achieved'
      : goal.status === 'missed'
      ? '❌ Goal missed'
      : goal.goalName ?? 'Goal set'
    : null;

  const handleStartPause = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sw.isRunning) {
      console.log(`[SessionsScreen] Pause stopwatch: id=${sw.id}`);
      pauseStopwatch(sw.id);
    } else {
      console.log(`[SessionsScreen] Start stopwatch: id=${sw.id}`);
      startStopwatch(sw.id);
    }
  };

  const handleLap = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = Date.now();
    const elapsed = getElapsedMs(sw);
    const prevSplit = laps.length > 0 ? laps[laps.length - 1].splitTime : 0;
    const lapTime = elapsed - prevSplit;
    const lap: Lap = {
      id: Math.random().toString(36).slice(2),
      lapNumber: laps.length + 1,
      lapTime,
      splitTime: elapsed,
      timestamp: new Date(now).toISOString(),
    };
    console.log(`[SessionsScreen] Add lap: stopwatchId=${sw.id} lapNumber=${lap.lapNumber}`);
    addLap(sw.id, lap);
  };

  const handleReset = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log(`[SessionsScreen] Reset stopwatch pressed: id=${sw.id}`);
    Alert.alert(
      'Reset stopwatch?',
      'This will clear the elapsed time and save a session if time was recorded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            console.log(`[SessionsScreen] Reset stopwatch confirmed: id=${sw.id}`);
            const totalTime = getElapsedMs(sw);
            if (totalTime > 0) {
              const session = {
                id: Math.random().toString(36).slice(2),
                stopwatchId: sw.id,
                stopwatchName: sw.name,
                category: sw.category ?? '',
                color: swColor,
                totalTime,
                laps: sw.laps ?? [],
                note: sw.note,
                startedAt: sw.startedAt
                  ? new Date(Date.now() - totalTime).toISOString()
                  : new Date().toISOString(),
                endedAt: new Date().toISOString(),
              };
              await saveSession(session);
              console.log(`[SessionsScreen] Session saved on reset: id=${session.id}`);
              if (goal && goal.status === 'active') {
                if (goal.goalType === 'target_duration' && goal.targetMs && totalTime >= goal.targetMs) {
                  await markGoalAchieved(sw.id);
                } else if (goal.goalType === 'target_laps' && goal.targetLaps && laps.length >= goal.targetLaps) {
                  await markGoalAchieved(sw.id);
                } else {
                  await markGoalMissed(sw.id);
                }
              }
              console.log(`[SessionsScreen] Navigating to session-complete: duration=${totalTime}, name=${sw.name}`);
              router.push(
                `/session-complete?duration=${totalTime}&name=${encodeURIComponent(sw.name)}&color=${encodeURIComponent(swColor)}`
              );
            }
            resetStopwatch(sw.id);
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log(`[SessionsScreen] Delete stopwatch pressed: id=${sw.id}`);
    Alert.alert(
      'Delete stopwatch?',
      `"${sw.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[SessionsScreen] Delete stopwatch confirmed: id=${sw.id}`);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            deleteStopwatch(sw.id);
          },
        },
      ]
    );
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateAnim }],
        marginHorizontal: 20,
        marginBottom: 12,
      }}
    >
      <Pressable
        onLongPress={() => {
          if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          console.log(`[SessionsScreen] Stopwatch long press: id=${sw.id}`);
          onLongPress();
        }}
        delayLongPress={400}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            borderLeftWidth: 3,
            borderLeftColor: swColor,
            padding: 18,
          }}
        >
          {/* Top row: name + status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            {sw.isRunning && <PulsingDot color={swColor} />}
            <Text
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.text }}
              numberOfLines={1}
            >
              {sw.name}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: sw.isRunning
                  ? 'rgba(34,197,94,0.12)'
                  : hasTime
                  ? 'rgba(251,146,60,0.12)'
                  : C.surfaceSecondary,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* Time display */}
          <Text
            style={{
              fontSize: 36,
              fontWeight: '800',
              fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
              color: sw.isRunning ? swColor : C.text,
              fontVariant: ['tabular-nums'],
              letterSpacing: -2,
              marginBottom: 6,
            }}
          >
            {elapsedDisplay}
          </Text>

          {/* Meta row: laps + goal */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {lapCountLabel !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Flag size={10} color={C.textSecondary} />
                <Text style={{ fontSize: 11, color: C.textSecondary }}>
                  {lapCountLabel}
                </Text>
              </View>
            )}
            {goalText !== null && (
              <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1 }} numberOfLines={1}>
                {goalText}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={handleStartPause}
              style={({ pressed }) => ({
                flex: 1,
                height: 40,
                borderRadius: 10,
                backgroundColor: sw.isRunning ? 'rgba(251,146,60,0.15)' : C.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: sw.isRunning ? '#fb923c' : C.primary }}>
                {sw.isRunning ? 'Pause' : 'Start'}
              </Text>
            </Pressable>

            {(sw.isRunning || hasTime) && (
              <Pressable
                onPress={handleLap}
                style={({ pressed }) => ({
                  height: 40,
                  width: 40,
                  borderRadius: 10,
                  backgroundColor: C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Flag size={15} color={C.textSecondary} />
              </Pressable>
            )}

            {hasTime && (
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => ({
                  height: 40,
                  width: 40,
                  borderRadius: 10,
                  backgroundColor: C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <RotateCcw size={15} color={C.textSecondary} />
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                console.log(`[SessionsScreen] Plan stopwatch pressed: id=${sw.id}`);
                onPlan();
              }}
              style={({ pressed }) => ({
                height: 40,
                width: 40,
                borderRadius: 10,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CalendarDays size={15} color={C.textSecondary} />
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                height: 40,
                width: 40,
                borderRadius: 10,
                backgroundColor: C.dangerMuted,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Trash2 size={15} color={C.danger} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Details Sheet (notes + laps) ────────────────────────────────────────────

interface DetailsSheetProps {
  sw: Stopwatch;
  onClose: () => void;
}

function DetailsSheet({ sw, onClose }: DetailsSheetProps) {
  const C = useColors();
  const { updateNote, updateLapNote } = useStopwatch();
  const [noteText, setNoteText] = useState(sw.note ?? '');
  const laps = sw.laps ?? [];

  const swColor = sw.color ?? DEFAULT_STOPWATCH_COLOR;

  let fastestId: string | undefined;
  let slowestId: string | undefined;
  if (laps.length >= 1) {
    fastestId = laps.reduce((a, b) => a.lapTime < b.lapTime ? a : b).id;
    if (laps.length >= 2) {
      slowestId = laps.reduce((a, b) => a.lapTime > b.lapTime ? a : b).id;
    }
  }

  const handleNoteBlur = () => {
    console.log(`[SessionsScreen] Update note: stopwatchId=${sw.id}`);
    updateNote(sw.id, noteText);
  };

  const handleLapLongPress = (lap: Lap) => {
    console.log(`[SessionsScreen] Lap long press: lapId=${lap.id}`);
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Lap Note',
        `Add a note for Lap ${lap.lapNumber}`,
        (text) => {
          if (text !== undefined) {
            console.log(`[SessionsScreen] Update lap note: lapId=${lap.id}`);
            updateLapNote(sw.id, lap.id, text);
          }
        },
        'plain-text',
        lap.note ?? ''
      );
    } else {
      Alert.alert('Lap Note', 'Lap notes can be added on iOS.', [{ text: 'OK' }]);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: swColor,
              marginRight: 10,
            }}
          />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: C.text }}>
            {sw.name}
          </Text>
          <Pressable
            onPress={() => {
              console.log('[SessionsScreen] Details sheet closed');
              onClose();
            }}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={16} color={C.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Note */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.subtext,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Note
          </Text>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            onBlur={handleNoteBlur}
            placeholder="Add a note…"
            placeholderTextColor={C.placeholder}
            multiline
            style={{
              backgroundColor: C.inputBg,
              borderRadius: 12,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              padding: 12,
              fontSize: 14,
              color: C.text,
              minHeight: 80,
              marginBottom: 24,
            }}
          />

          {/* Laps */}
          {laps.length > 0 && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <Flag size={14} color={C.textSecondary} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: C.subtext,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {`${laps.length} Lap${laps.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 8,
                }}
              >
                {/* Column headers */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 6 }}>
                  <View style={{ width: 36 }}>
                    <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>#</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>Lap Time</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>Split</Text>
                </View>
                <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 4 }} />
                {laps.map(lap => {
                  const isFastest = lap.id === fastestId;
                  const isSlowest = laps.length >= 2 && lap.id === slowestId;
                  const rowBg = isFastest
                    ? 'rgba(52,199,89,0.08)'
                    : isSlowest
                    ? 'rgba(255,59,48,0.08)'
                    : 'transparent';
                  const lapTimeColor = isFastest ? '#34C759' : isSlowest ? '#FF3B30' : C.text;
                  const lapTimeDisplay = formatTime(lap.lapTime);
                  const splitTimeDisplay = formatTime(lap.splitTime);
                  const lapNumStr = String(lap.lapNumber);
                  return (
                    <Pressable
                      key={lap.id}
                      onLongPress={() => handleLapLongPress(lap)}
                      delayLongPress={400}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        backgroundColor: rowBg,
                        borderRadius: 8,
                        borderCurve: 'continuous',
                        marginBottom: 2,
                      }}
                    >
                      <View style={{ width: 36 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>
                          {lapNumStr}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '600',
                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
                            color: lapTimeColor,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {lapTimeDisplay}
                        </Text>
                        {lap.note ? (
                          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                            {lap.note}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
                          color: C.textSecondary,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {splitTimeDisplay}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Timer Card ───────────────────────────────────────────────────────────────

interface TimerCardProps {
  config: TimerConfig;
  runtime: TimerRuntime;
  goal: ItemGoal | undefined;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onPlan: () => void;
}

function TimerCard({ config, runtime, goal, onStart, onPause, onReset, onDelete, onPlan }: TimerCardProps) {
  const C = useColors();
  const timerColor = config.color ?? '#fb923c';

  const modeLabel =
    config.mode === 'countdown'
      ? 'Countdown'
      : config.mode === 'interval'
      ? 'Interval'
      : 'HIIT';

  const phaseLabel =
    runtime.phase === 'work'
      ? 'WORK'
      : runtime.phase === 'rest'
      ? 'REST'
      : null;

  const remainingDisplay = formatTime(runtime.remainingMs);

  const totalRounds = config.rounds ?? 1;
  const roundsLabel =
    config.mode !== 'countdown'
      ? `Round ${runtime.currentRound}/${totalRounds}`
      : null;

  const goalText = goal
    ? goal.status === 'achieved'
      ? '🏆 Goal achieved'
      : goal.status === 'missed'
      ? '❌ Goal missed'
      : goal.goalName ?? 'Goal set'
    : null;

  const handleStartPause = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (runtime.isRunning) {
      console.log(`[SessionsScreen] Pause timer: id=${config.id}`);
      onPause();
    } else {
      console.log(`[SessionsScreen] Start timer: id=${config.id}`);
      onStart();
    }
  };

  const handleReset = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log(`[SessionsScreen] Reset timer: id=${config.id}`);
    onReset();
  };

  const handleDelete = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log(`[SessionsScreen] Delete timer pressed: id=${config.id}`);
    Alert.alert(
      'Delete Timer?',
      `"${config.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[SessionsScreen] Delete timer confirmed: id=${config.id}`);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onDelete();
          },
        },
      ]
    );
  };

  const handleLongPress = () => {
    console.log(`[SessionsScreen] Timer long press: id=${config.id}`);
    Alert.alert(
      'Edit Timer',
      'Delete this timer and create a new one to change its settings.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            borderLeftWidth: 3,
            borderLeftColor: timerColor,
            padding: 18,
          }}
        >
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            {runtime.isRunning && <PulsingDot color={timerColor} />}
            <Text
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.text }}
              numberOfLines={1}
            >
              {config.name}
            </Text>
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: C.surfaceSecondary,
                marginLeft: 8,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {modeLabel}
              </Text>
            </View>
          </View>

          {/* Time display */}
          {runtime.isComplete ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
                  color: '#22c55e',
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -2,
                }}
              >
                00:00:00.00
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: 'rgba(34,197,94,0.12)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>
                  Done
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
                color: runtime.isRunning ? timerColor : C.text,
                fontVariant: ['tabular-nums'],
                letterSpacing: -2,
                marginBottom: 6,
              }}
            >
              {remainingDisplay}
            </Text>
          )}

          {/* Meta row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {phaseLabel !== null && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: runtime.phase === 'work'
                    ? `${timerColor}26`
                    : 'rgba(251,146,60,0.15)',
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: runtime.phase === 'work' ? timerColor : '#fb923c',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {phaseLabel}
                </Text>
              </View>
            )}
            {roundsLabel !== null && (
              <Text style={{ fontSize: 11, color: C.textSecondary }}>{roundsLabel}</Text>
            )}
            {goalText !== null && (
              <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1 }} numberOfLines={1}>
                {goalText}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!runtime.isComplete && (
              <Pressable
                onPress={handleStartPause}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: runtime.isRunning
                    ? 'rgba(251,146,60,0.15)'
                    : C.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: runtime.isRunning ? '#fb923c' : C.primary,
                  }}
                >
                  {runtime.isRunning ? 'Pause' : 'Start'}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                height: 40,
                width: 40,
                borderRadius: 10,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <RotateCcw size={15} color={C.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => {
                console.log(`[SessionsScreen] Plan timer pressed: id=${config.id}`);
                onPlan();
              }}
              style={({ pressed }) => ({
                height: 40,
                width: 40,
                borderRadius: 10,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CalendarDays size={15} color={C.textSecondary} />
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                height: 40,
                width: 40,
                borderRadius: 10,
                backgroundColor: C.dangerMuted,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Trash2 size={15} color={C.danger} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Stopwatch state
  const {
    stopwatches,
    startStopwatch,
    pauseStopwatch,
  } = useStopwatch();
  const { categories, selectedCategory, setSelectedCategory } = useCategory();

  // Goals
  const [goalsMap, setGoalsMap] = useState<Record<string, ItemGoal>>({});

  // Timer state
  const [timerConfigs, setTimerConfigs] = useState<TimerConfig[]>([]);
  const [timerRuntimes, setTimerRuntimes] = useState<Record<string, TimerRuntime>>({});

  // UI state
  const [activeTab, setActiveTab] = useState<'stopwatches' | 'timers'>('stopwatches');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [detailsSheet, setDetailsSheet] = useState<{ sw: Stopwatch } | null>(null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Tick for stopwatch display ──────────────────────────────────────────────
  useEffect(() => {
    const anyRunning = stopwatches.some(sw => sw.isRunning);
    const anyTimerRunning = Object.values(timerRuntimes).some(r => r.isRunning);
    if (anyRunning || anyTimerRunning) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => setTick(t => t + 1), 100);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stopwatches, timerRuntimes]);

  // ── Timer tick logic ────────────────────────────────────────────────────────
  useEffect(() => {
    const anyRunning = Object.values(timerRuntimes).some(r => r.isRunning);
    if (!anyRunning) return;

    const id = setInterval(() => {
      const now = Date.now();
      setTimerRuntimes(prev => {
        const next = { ...prev };
        for (const configId of Object.keys(next)) {
          const r = next[configId];
          if (!r.isRunning || r.startedAt === null || r.isComplete) continue;
          const cfg = timerConfigs.find(c => c.id === configId);
          if (!cfg) continue;

          const elapsed = now - r.startedAt;
          const newRemaining = r.remainingMs - elapsed;
          next[configId] = { ...r, startedAt: now };

          if (newRemaining <= 0) {
            // Phase transition
            if (cfg.mode === 'countdown') {
              next[configId] = { ...next[configId], remainingMs: 0, isRunning: false, isComplete: true, startedAt: null };
              markGoalAchieved(configId).catch(() => {});
            } else {
              // interval / hiit
              const totalRounds = cfg.rounds ?? 1;
              if (r.phase === 'work') {
                if (cfg.restMs && cfg.restMs > 0) {
                  next[configId] = { ...next[configId], phase: 'rest', remainingMs: cfg.restMs, startedAt: now };
                } else {
                  // no rest — go to next round
                  const nextRound = r.currentRound + 1;
                  if (nextRound > totalRounds) {
                    next[configId] = { ...next[configId], remainingMs: 0, isRunning: false, isComplete: true, startedAt: null };
                    markGoalAchieved(configId).catch(() => {});
                  } else {
                    next[configId] = { ...next[configId], phase: 'work', currentRound: nextRound, remainingMs: cfg.workMs ?? 60000, startedAt: now };
                  }
                }
              } else {
                // rest -> next round
                const nextRound = r.currentRound + 1;
                if (nextRound > totalRounds) {
                  next[configId] = { ...next[configId], remainingMs: 0, isRunning: false, isComplete: true, startedAt: null };
                  markGoalAchieved(configId).catch(() => {});
                } else {
                  next[configId] = { ...next[configId], phase: 'work', currentRound: nextRound, remainingMs: cfg.workMs ?? 60000, startedAt: now };
                }
              }
            }
          } else {
            next[configId] = { ...next[configId], remainingMs: newRemaining, startedAt: now };
          }
        }
        return next;
      });
    }, 100);

    return () => clearInterval(id);
  }, [timerRuntimes, timerConfigs]);

  // ── Load on focus ───────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      console.log('[SessionsScreen] Focus: loading goals + timer configs');
      Promise.all([getGoals(), getTimerConfigs(), loadTimerCategories()]).then(
        ([goals, configs]) => {
          const map: Record<string, ItemGoal> = {};
          for (const g of goals) {
            map[g.itemId] = g;
          }
          setGoalsMap(map);
          setTimerConfigs(configs);
          setTimerRuntimes(prev => {
            const next = { ...prev };
            for (const cfg of configs) {
              if (!next[cfg.id]) next[cfg.id] = makeInitialRuntime(cfg);
            }
            for (const id of Object.keys(next)) {
              if (!configs.find(c => c.id === id)) delete next[id];
            }
            return next;
          });
          console.log(`[SessionsScreen] Loaded ${goals.length} goal(s), ${configs.length} timer config(s)`);
        }
      );
    }, [])
  );

  // ── Filtered stopwatches ────────────────────────────────────────────────────
  const filteredStopwatches =
    selectedCategory === 'all'
      ? stopwatches
      : stopwatches.filter(sw => sw.category === selectedCategory);

  // ── Timer handlers ──────────────────────────────────────────────────────────
  const handleTimerStart = useCallback((configId: string) => {
    setTimerRuntimes(prev => {
      const r = prev[configId];
      if (!r || r.isComplete) return prev;
      return { ...prev, [configId]: { ...r, isRunning: true, startedAt: Date.now() } };
    });
  }, []);

  const handleTimerPause = useCallback((configId: string) => {
    setTimerRuntimes(prev => {
      const r = prev[configId];
      if (!r) return prev;
      return { ...prev, [configId]: { ...r, isRunning: false, startedAt: null } };
    });
  }, []);

  const handleTimerReset = useCallback(async (configId: string) => {
    const cfg = timerConfigs.find(c => c.id === configId);
    if (!cfg) return;
    const runtime = timerRuntimes[configId];

    let totalTime = runtime?.accumulatedMs ?? 0;
    if (runtime?.isRunning && runtime?.startedAt != null) {
      totalTime += Date.now() - runtime.startedAt;
    }

    if (totalTime > 1000) {
      const session = {
        id: Math.random().toString(36).slice(2),
        stopwatchId: cfg.id,
        stopwatchName: cfg.name,
        category: cfg.category ?? '',
        color: cfg.color ?? '#fb923c',
        totalTime,
        laps: [],
        note: undefined,
        startedAt: new Date(Date.now() - totalTime).toISOString(),
        endedAt: new Date().toISOString(),
      };
      console.log(`[SessionsScreen] Timer reset — saving session: id=${session.id}, totalTime=${totalTime}ms`);
      await saveSession(session);

      const goal = goalsMap[configId];
      if (goal && goal.status === 'active') {
        const achieved =
          (goal.goalType === 'complete_countdown' && runtime?.isComplete) ||
          (goal.goalType === 'complete_all_rounds' && runtime?.isComplete);
        if (achieved) {
          await markGoalAchieved(configId);
        } else {
          await markGoalMissed(configId);
        }
      }
    }

    setTimerRuntimes(prev => ({
      ...prev,
      [configId]: makeInitialRuntime(cfg),
    }));
  }, [timerConfigs, timerRuntimes, goalsMap]);

  const handleTimerDelete = useCallback(async (configId: string) => {
    await deleteTimerConfig(configId);
    setTimerConfigs(prev => prev.filter(c => c.id !== configId));
    setTimerRuntimes(prev => {
      const next = { ...prev };
      delete next[configId];
      return next;
    });
  }, []);

  // ── Category chips ──────────────────────────────────────────────────────────
  const allCategoryChips = categories;

  // ── Tick value for stopwatch cards ─────────────────────────────────────────
  const [tick] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
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
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 32,
              fontWeight: '800',
              color: C.text,
              letterSpacing: -0.8,
            }}
          >
            Sessions
          </Text>
          {/* Add button — context-aware */}
          <Pressable
            onPress={() => {
              if (activeTab === 'timers') {
                console.log('[SessionsScreen] Add button pressed — opening timer-modal');
                router.push('/timer-modal');
              } else {
                console.log('[SessionsScreen] Add button pressed — opening stopwatch-modal');
                router.push('/stopwatch-modal');
              }
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: C.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Plus size={18} color={C.text} />
          </Pressable>
        </View>
      </View>

      {/* ── Segmented Control ── */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.surfaceSecondary,
          borderRadius: 12,
          padding: 3,
          marginHorizontal: 20,
          marginTop: 14,
          marginBottom: 4,
        }}
      >
        <Pressable
          onPress={() => {
            console.log('[SessionsScreen] Segmented control: Stopwatches tab pressed');
            setActiveTab('stopwatches');
          }}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            borderRadius: 10,
            backgroundColor: activeTab === 'stopwatches' ? C.card : 'transparent',
            ...(activeTab === 'stopwatches' && Platform.OS === 'ios'
              ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }
              : {}),
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'stopwatches' ? '600' : '500',
              color: activeTab === 'stopwatches' ? C.text : C.subtext,
            }}
          >
            Stopwatches
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            console.log('[SessionsScreen] Segmented control: Timers tab pressed');
            setActiveTab('timers');
          }}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            borderRadius: 10,
            backgroundColor: activeTab === 'timers' ? C.card : 'transparent',
            ...(activeTab === 'timers' && Platform.OS === 'ios'
              ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }
              : {}),
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'timers' ? '600' : '500',
              color: activeTab === 'timers' ? C.text : C.subtext,
            }}
          >
            Timers
          </Text>
        </Pressable>
      </View>

      {/* ── Scroll content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {activeTab === 'stopwatches' ? (
          <>
            {/* ════ STOPWATCHES SECTION ════ */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                marginTop: 20,
                marginBottom: 12,
              }}
            >
              {stopwatches.length > 0 && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: C.surfaceSecondary,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600' }}>
                    {stopwatches.length}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => {
                  console.log(`[SessionsScreen] Presets toggle: ${!presetsExpanded ? 'expand' : 'collapse'}`);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setPresetsExpanded(p => !p);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: presetsExpanded ? C.chipSelected : C.chipBackground,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: presetsExpanded ? C.chipSelectedText : C.chipText,
                  }}
                >
                  Presets
                </Text>
                {presetsExpanded ? (
                  <ChevronUp size={12} color={C.chipSelectedText} />
                ) : (
                  <ChevronDown size={12} color={C.chipText} />
                )}
              </Pressable>
            </View>

            {/* Preset chips row */}
            {presetsExpanded && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
              >
                {PRESETS.map(preset => (
                  <Pressable
                    key={preset.key}
                    onPress={() => {
                      console.log(`[SessionsScreen] Preset chip pressed: ${preset.key}`);
                      setShowAddSheet(false);
                      router.push(`/stopwatch-modal?preset=${preset.key}`);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: C.card,
                      borderWidth: 1,
                      borderColor: C.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 14 }}>{preset.emoji}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: C.text }}>
                      {preset.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* Category filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
            >
              {allCategoryChips.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      console.log(`[SessionsScreen] Category chip pressed: ${cat.id}`);
                      setSelectedCategory(cat.id);
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: isSelected ? C.chipSelected : C.chipBackground,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: isSelected ? C.chipSelectedText : C.chipText,
                      }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Stopwatch cards */}
            {filteredStopwatches.map((sw, index) => (
              <StopwatchCard
                key={sw.id}
                sw={sw}
                index={index}
                total={filteredStopwatches.length}
                goal={goalsMap[sw.id]}
                onLongPress={() => setDetailsSheet({ sw })}
                tick={tick}
                onPlan={() => {
                  console.log(`[SessionsScreen] Plan stopwatch: id=${sw.id}, name="${sw.name}"`);
                  router.push(`/plan-session-modal?itemType=stopwatch&itemId=${sw.id}`);
                }}
              />
            ))}

            {/* Stopwatch empty state */}
            {filteredStopwatches.length === 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 24,
                    alignItems: 'center',
                  }}
                >
                  <Timer size={32} color={C.subtext} style={{ marginBottom: 10 }} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: C.text,
                      marginBottom: 4,
                    }}
                  >
                    No stopwatches yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      textAlign: 'center',
                      lineHeight: 18,
                    }}
                  >
                    Tap + to create your first stopwatch
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {/* ════ TIMERS SECTION ════ */}
            <View style={{ marginTop: 20 }} />

            {/* Timer cards */}
            {timerConfigs.map(config => {
              const runtime = timerRuntimes[config.id] ?? makeInitialRuntime(config);
              return (
                <TimerCard
                  key={config.id}
                  config={config}
                  runtime={runtime}
                  goal={goalsMap[config.id]}
                  onStart={() => handleTimerStart(config.id)}
                  onPause={() => handleTimerPause(config.id)}
                  onReset={() => handleTimerReset(config.id)}
                  onDelete={() => handleTimerDelete(config.id)}
                  onPlan={() => {
                    console.log(`[SessionsScreen] Plan timer: id=${config.id}, name="${config.name}"`);
                    router.push(`/plan-session-modal?itemType=timer&itemId=${config.id}`);
                  }}
                />
              );
            })}

            {/* Timer empty state */}
            {timerConfigs.length === 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 24,
                    alignItems: 'center',
                  }}
                >
                  <Timer size={32} color={C.subtext} style={{ marginBottom: 10 }} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: C.text,
                      marginBottom: 4,
                    }}
                  >
                    No timers yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      textAlign: 'center',
                      lineHeight: 18,
                      marginBottom: 16,
                    }}
                  >
                    Create a countdown, interval, or HIIT timer
                  </Text>
                  <Pressable
                    onPress={() => {
                      console.log('[SessionsScreen] Timer empty state — Create Timer pressed');
                      router.push('/timer-modal');
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: C.primaryMuted,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>
                      Create Timer
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Add Action Sheet ── */}
      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSheet(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => {
            console.log('[SessionsScreen] Add sheet backdrop pressed — closing');
            setShowAddSheet(false);
          }}
        />
        <View
          style={{
            backgroundColor: C.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 8,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.border,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.subtext,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            Create New
          </Text>

          {/* New Stopwatch */}
          <Pressable
            onPress={() => {
              console.log('[SessionsScreen] New Stopwatch pressed');
              setShowAddSheet(false);
              router.push('/stopwatch-modal');
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 16,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: C.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Timer size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
                New Stopwatch
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                Track elapsed time with laps
              </Text>
            </View>
          </Pressable>

          <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 74 }} />

          {/* New Timer */}
          <Pressable
            onPress={() => {
              console.log('[SessionsScreen] New Timer pressed');
              setShowAddSheet(false);
              router.push('/timer-modal');
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 16,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(251,146,60,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Zap size={22} color="#fb923c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
                New Timer
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                Countdown, interval, or HIIT
              </Text>
            </View>
          </Pressable>
        </View>
      </Modal>

      {/* ── Details Sheet ── */}
      {detailsSheet && (
        <DetailsSheet
          sw={detailsSheet.sw}
          onClose={() => setDetailsSheet(null)}
        />
      )}
    </View>
  );
}
