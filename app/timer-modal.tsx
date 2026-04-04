import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/Colors';
import { TimerConfig, TimerMode, getTimerConfigs, saveTimerConfig } from '@/utils/timer-storage';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ItemGoal,
  getGoalForItem,
  saveGoal,
  deleteGoalForItem,
  markGoalAchieved,
} from '@/utils/goal-storage';
import { loadTimerCategories, addTimerCategory, TimerCategory } from '@/utils/timer-category-storage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Timer, Repeat, Zap, Check, Pause, Play, RotateCcw } from 'lucide-react-native';
import { notifyTimerComplete } from '@/utils/completion-notifications';

function timerNoteKey(id: string): string {
  return `notes_timer_${id}`;
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

// ─── HIIT Presets ─────────────────────────────────────────────────────────────

const HIIT_PRESETS = [
  { label: 'Tabata', workMs: 20000, restMs: 10000, rounds: 8 },
  { label: 'Sprint', workMs: 30000, restMs: 15000, rounds: 6 },
  { label: 'Power',  workMs: 40000, restMs: 20000, rounds: 5 },
  { label: 'Custom', workMs: 0,     restMs: 0,     rounds: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatCountdownHero(days: number, hours: number, minutes: number, seconds: number): string {
  if (days > 0) {
    return `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function formatMsShort(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function formatRemainingMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({
  hex, label, isSelected, onPress,
}: { hex: string; label: string; isSelected: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: hex,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isSelected ? 3 : 0,
        borderColor: isSelected ? '#007AFF' : 'transparent',
        boxShadow: isSelected ? `0 0 0 2px ${hex}` : '0 1px 3px rgba(0,0,0,0.15)',
      }}
      scaleValue={0.88}
    >
      {isSelected && (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffffff' }} />
      )}
    </AnimatedPressable>
  );
}

// ─── Number Input ─────────────────────────────────────────────────────────────

function NumberInput({
  label, value, onChange, min = 0, max = 999, colWidth,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; colWidth?: number }) {
  const C = useColors();
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  const handleChange = (t: string) => {
    setText(t);
    const n = parseInt(t, 10);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
  };

  const handleDecrement = () => {
    const next = Math.max(min, value - 1);
    onChange(next);
    setText(String(next));
  };

  const handleIncrement = () => {
    const next = Math.min(max, value + 1);
    onChange(next);
    setText(String(next));
  };

  // colWidth drives the overall column width; input fills it minus button space
  const inputWidth = colWidth ? Math.max(36, colWidth - 72) : 48;

  return (
    <View style={{ alignItems: 'center', gap: 4, width: colWidth }}>
      <Text
        style={{ fontSize: 10, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 14 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        onPress={handleIncrement}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 20, fontWeight: '300', color: C.textSecondary, lineHeight: 24 }}>+</Text>
      </Pressable>
      <View
        style={{
          backgroundColor: C.surfaceSecondary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          width: inputWidth,
          alignItems: 'center',
        }}
      >
        <TextInput
          value={text}
          onChangeText={handleChange}
          keyboardType="number-pad"
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: C.text,
            textAlign: 'center',
            paddingVertical: 8,
            paddingHorizontal: 4,
            width: '100%',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontVariant: ['tabular-nums'],
          }}
          maxLength={3}
        />
      </View>
      <Pressable
        onPress={handleDecrement}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 20, fontWeight: '300', color: C.textSecondary, lineHeight: 24 }}>−</Text>
      </Pressable>
    </View>
  );
}

// ─── Running Timer View ───────────────────────────────────────────────────────

interface RunningTimerViewProps {
  config: TimerConfig;
  plannedId?: string;
  onClose: () => void;
}

function RunningTimerView({ config, plannedId, onClose }: RunningTimerViewProps) {
  const C = useColors();
  const { width, height } = useWindowDimensions();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const timerColor = config.color ?? '#fb923c';
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  // Responsive sizing
  const countdownFontSize = Math.min(width * 0.22, 88);
  const countdownLineHeight = countdownFontSize * 1.1;
  const isCompact = height < 700;

  const totalMs =
    config.mode === 'countdown'
      ? (config.countdownMs ?? 60000)
      : (config.workMs ?? 60000);

  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [phase, setPhase] = useState<'work' | 'rest' | 'countdown'>(
    config.mode === 'countdown' ? 'countdown' : 'work'
  );
  const [currentRound, setCurrentRound] = useState(1);

  const startedAtRef = useRef<number | null>(null);
  const remainingRef = useRef(remainingMs);
  const phaseRef = useRef(phase);
  const roundRef = useRef(currentRound);
  const isRunningRef = useRef(false);
  const isCompleteRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  remainingRef.current = remainingMs;
  phaseRef.current = phase;
  roundRef.current = currentRound;
  isRunningRef.current = isRunning;
  isCompleteRef.current = isComplete;

  const totalRounds = config.rounds ?? 1;

  const handleComplete = useCallback(async () => {
    console.log(`[RunningTimerView] Timer complete: ${config.name}`);
    setIsComplete(true);
    setIsRunning(false);
    setRemainingMs(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    await markGoalAchieved(config.id).catch(() => {});
    await notifyTimerComplete(config.name).catch(() => {});
    // Mark the specific planned session done if one was passed
    if (plannedId) {
      try {
        const { markPlannedSessionDone } = await import('@/utils/planned-sessions-storage');
        console.log(`[RunningTimerView] Marking planned session done via plannedId: ${plannedId}`);
        await markPlannedSessionDone(plannedId);
      } catch {}
    } else {
      // Fallback: scan today's planned sessions for this timer
      try {
        const { getPlannedSessions, savePlannedSession, todayDateString } = await import('@/utils/planned-sessions-storage');
        const today = todayDateString();
        const all = await getPlannedSessions();
        for (const p of all) {
          if (p.date === today && p.itemId === config.id && (p.status === 'pending' || p.status === 'in_progress')) {
            console.log(`[RunningTimerView] Marking planned session done (fallback scan): id=${p.id}`);
            await savePlannedSession({ ...p, status: 'done' });
          }
        }
      } catch {}
    }
  }, [config.id, config.name, plannedId]);

  const tick = useCallback(() => {
    if (!isRunningRef.current || isCompleteRef.current) return;
    const now = Date.now();
    const elapsed = startedAtRef.current !== null ? now - startedAtRef.current : 0;
    startedAtRef.current = now;

    const newRemaining = remainingRef.current - elapsed;

    if (newRemaining <= 0) {
      if (config.mode === 'countdown') {
        handleComplete();
        return;
      }
      // interval / hiit
      const currentPhase = phaseRef.current;
      const currentRoundVal = roundRef.current;
      if (currentPhase === 'work') {
        if (config.restMs && config.restMs > 0) {
          setPhase('rest');
          setRemainingMs(config.restMs);
          startedAtRef.current = Date.now();
        } else {
          const nextRound = currentRoundVal + 1;
          if (nextRound > totalRounds) {
            handleComplete();
          } else {
            setCurrentRound(nextRound);
            setRemainingMs(config.workMs ?? 60000);
            startedAtRef.current = Date.now();
          }
        }
      } else {
        const nextRound = currentRoundVal + 1;
        if (nextRound > totalRounds) {
          handleComplete();
        } else {
          setCurrentRound(nextRound);
          setPhase('work');
          setRemainingMs(config.workMs ?? 60000);
          startedAtRef.current = Date.now();
        }
      }
    } else {
      setRemainingMs(newRemaining);
    }
  }, [config, totalRounds, handleComplete]);

  // Auto-start on mount
  useEffect(() => {
    console.log(`[RunningTimerView] Auto-starting timer: ${config.name}`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setIsRunning(true);
    startedAtRef.current = Date.now();
    isRunningRef.current = true;
  }, []);

  useEffect(() => {
    if (isRunning && !isComplete) {
      intervalRef.current = setInterval(tick, 50);
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
  }, [isRunning, isComplete, tick]);

  const handlePause = () => {
    console.log(`[RunningTimerView] Pause timer: ${config.name}`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsRunning(false);
    startedAtRef.current = null;
  };

  const handleResume = () => {
    console.log(`[RunningTimerView] Resume timer: ${config.name}`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setIsRunning(true);
    startedAtRef.current = Date.now();
  };

  const handleReset = () => {
    console.log(`[RunningTimerView] Reset timer: ${config.name}`);
    setIsRunning(false);
    setIsComplete(false);
    setRemainingMs(totalMs);
    setPhase(config.mode === 'countdown' ? 'countdown' : 'work');
    setCurrentRound(1);
    startedAtRef.current = null;
  };

  const progressPercent = totalMs > 0 ? Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100)) : 0;
  const remainingDisplay = formatRemainingMs(remainingMs);

  const phaseLabel = phase === 'work' ? 'WORK' : phase === 'rest' ? 'REST' : null;
  const roundsLabel = config.mode !== 'countdown' ? `Round ${currentRound}/${totalRounds}` : null;

  const statusText = isComplete ? 'Complete' : isRunning ? 'Running' : 'Paused';
  const statusColor = isComplete ? '#22c55e' : isRunning ? timerColor : '#fb923c';
  const statusBg = isComplete ? 'rgba(34,197,94,0.12)' : isRunning ? `${timerColor}18` : 'rgba(251,146,60,0.12)';

  const statusBadgeMargin = isCompact ? 16 : 32;
  const countdownMargin = isCompact ? 16 : 24;
  const phaseMargin = isCompact ? 24 : 48;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
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
            onPress={() => {
              console.log('[RunningTimerView] Close pressed');
              onClose();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500', lineHeight: 22 }}>
              Close
            </Text>
          </Pressable>
          <Text
            style={{ fontSize: 17, fontWeight: '600', color: C.text, letterSpacing: -0.3, lineHeight: 22, flex: 1, textAlign: 'center', marginHorizontal: 8 }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {config.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: safeBottom + 24 }}>
        {/* Top spacer + status badge */}
        <View style={{ alignItems: 'center', marginTop: statusBadgeMargin }}>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: statusBg,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Countdown display */}
        <View
          style={{
            alignItems: 'center',
            boxShadow: isRunning ? `0 0 60px ${timerColor}30` : undefined,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              fontSize: countdownFontSize,
              fontWeight: '800',
              fontFamily: timerFont,
              color: isComplete ? '#22c55e' : isRunning ? timerColor : C.text,
              fontVariant: ['tabular-nums'],
              letterSpacing: -3,
              lineHeight: countdownLineHeight,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isComplete ? '00:00' : remainingDisplay}
          </Text>
        </View>

        {/* Progress bar + phase/round labels */}
        <View style={{ width: '100%', alignItems: 'center', gap: isCompact ? 12 : 16 }}>
          <View
            style={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              backgroundColor: `${timerColor}28`,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: isComplete ? '#22c55e' : timerColor,
                width: `${isComplete ? 100 : progressPercent}%`,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {phaseLabel !== null && (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: phase === 'work' ? `${timerColor}26` : 'rgba(251,146,60,0.15)',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: phase === 'work' ? timerColor : '#fb923c',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {phaseLabel}
                </Text>
              </View>
            )}
            {roundsLabel !== null && (
              <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '500' }} numberOfLines={1}>
                {roundsLabel}
              </Text>
            )}
          </View>
        </View>

        {/* Controls */}
        {!isComplete ? (
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: C.surfaceSecondary,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <RotateCcw size={22} color={C.textSecondary} />
            </Pressable>

            <Pressable
              onPress={isRunning ? handlePause : handleResume}
              style={({ pressed }) => ({
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: isRunning ? 'rgba(251,146,60,0.15)' : timerColor,
                borderWidth: isRunning ? 1 : 0,
                borderColor: isRunning ? '#fb923c40' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
                boxShadow: isRunning ? undefined : `0 0 32px ${timerColor}50`,
              })}
            >
              {isRunning ? (
                <Pause size={32} color="#fb923c" />
              ) : (
                <Play size={32} color={getContrastColor(timerColor)} />
              )}
            </Pressable>

            <View style={{ width: 56 }} />
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 20,
                backgroundColor: 'rgba(34,197,94,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(34,197,94,0.3)',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#22c55e' }}>
                Timer Complete!
              </Text>
            </View>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: C.surfaceSecondary,
                borderWidth: 1,
                borderColor: C.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>
                Restart
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function TimerModal() {
  const C = useColors();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { edit, autoStart, id: idParam, plannedId } = useLocalSearchParams<{ edit?: string; autoStart?: string; id?: string; plannedId?: string }>();
  const { isSubscribed } = useSubscription();

  // autoStart=true + id=<timerId> means load and immediately run that timer
  // Legacy: autoStart=<timerId> (old format) also supported
  const autoStartTimerId = autoStart === 'true' ? (idParam ?? null) : (autoStart ?? null);
  const isAutoStart = Boolean(autoStartTimerId);

  const [autoStartConfig, setAutoStartConfig] = useState<TimerConfig | null>(null);
  const [autoStartLoading, setAutoStartLoading] = useState(isAutoStart);

  useEffect(() => {
    if (!autoStartTimerId) return;
    console.log(`[TimerModal] autoStart mode: loading config id=${autoStartTimerId}`);
    getTimerConfigs().then(configs => {
      const cfg = configs.find(c => c.id === autoStartTimerId);
      if (cfg) {
        console.log(`[TimerModal] autoStart config found: name="${cfg.name}"`);
        setAutoStartConfig(cfg);
      } else {
        console.warn(`[TimerModal] autoStart config not found for id=${autoStartTimerId}`);
      }
      setAutoStartLoading(false);
    });
  }, [autoStartTimerId]);

  const [mode, setMode] = useState<TimerMode>('countdown');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#22c55e');

  const [cdDays, setCdDays] = useState(0);
  const [cdHours, setCdHours] = useState(0);
  const [cdMinutes, setCdMinutes] = useState(5);
  const [cdSeconds, setCdSeconds] = useState(0);

  const [ivWorkMin, setIvWorkMin] = useState(0);
  const [ivWorkSec, setIvWorkSec] = useState(30);
  const [ivRestMin, setIvRestMin] = useState(0);
  const [ivRestSec, setIvRestSec] = useState(15);
  const [ivRounds, setIvRounds] = useState(8);

  const [hiitPreset, setHiitPreset] = useState(0);
  const [hiitWorkMin, setHiitWorkMin] = useState(0);
  const [hiitWorkSec, setHiitWorkSec] = useState(20);
  const [hiitRestMin, setHiitRestMin] = useState(0);
  const [hiitRestSec, setHiitRestSec] = useState(10);
  const [hiitRounds, setHiitRounds] = useState(8);

  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [timerCategories, setTimerCategories] = useState<TimerCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');

  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [existingGoal, setExistingGoal] = useState<ItemGoal | null>(null);
  const [creationGoalText, setCreationGoalText] = useState('');
  const [timerNote, setTimerNote] = useState('');

  const [nameError, setNameError] = useState('');
  const [durationError, setDurationError] = useState('');

  useEffect(() => {
    loadTimerCategories().then(setTimerCategories);
  }, []);

  useEffect(() => {
    if (!edit) return;
    console.log(`[TimerModal] Loading existing timer config id=${edit}`);
    getTimerConfigs().then(configs => {
      const cfg = configs.find(c => c.id === edit);
      if (!cfg) return;
      setMode(cfg.mode);
      setName(cfg.name);
      setColor(cfg.color);
      setSelectedCategoryId(cfg.category ?? 'all');
      if (cfg.mode === 'countdown' && cfg.countdownMs) {
        const totalSec = Math.floor(cfg.countdownMs / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        setCdDays(days);
        setCdHours(hours);
        setCdMinutes(mins);
        setCdSeconds(secs);
      }
      if (cfg.mode === 'interval' || cfg.mode === 'hiit') {
        const wSec = Math.floor((cfg.workMs ?? 0) / 1000);
        const rSec = Math.floor((cfg.restMs ?? 0) / 1000);
        if (cfg.mode === 'interval') {
          setIvWorkMin(Math.floor(wSec / 60)); setIvWorkSec(wSec % 60);
          setIvRestMin(Math.floor(rSec / 60)); setIvRestSec(rSec % 60);
          setIvRounds(cfg.rounds ?? 8);
        } else {
          setHiitWorkMin(Math.floor(wSec / 60)); setHiitWorkSec(wSec % 60);
          setHiitRestMin(Math.floor(rSec / 60)); setHiitRestSec(rSec % 60);
          setHiitRounds(cfg.rounds ?? 8);
          setHiitPreset(3);
        }
      }
    });
  }, [edit]);

  useEffect(() => {
    if (!edit) return;
    console.log(`[TimerModal] Loading goal for timerId=${edit}`);
    getGoalForItem(edit).then(goal => {
      if (!goal) return;
      setExistingGoal(goal);
      setGoalEnabled(true);
      setGoalName(goal.goalName ?? '');
      console.log(`[TimerModal] Existing goal loaded: type=${goal.goalType}`);
    });
  }, [edit]);

  useEffect(() => {
    if (!edit) return;
    console.log(`[TimerModal] Loading note for timerId=${edit}`);
    AsyncStorage.getItem(timerNoteKey(edit)).then(val => {
      if (val !== null) {
        setTimerNote(val);
        console.log(`[TimerModal] Note loaded for timerId=${edit}`);
      }
    }).catch(() => {});
  }, [edit]);

  const applyHiitPreset = (idx: number) => {
    console.log(`[TimerModal] HIIT preset selected: ${HIIT_PRESETS[idx].label}`);
    setHiitPreset(idx);
    if (idx < 3) {
      const p = HIIT_PRESETS[idx];
      setHiitWorkMin(0); setHiitWorkSec(p.workMs / 1000);
      setHiitRestMin(0); setHiitRestSec(p.restMs / 1000);
      setHiitRounds(p.rounds);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    console.log(`[TimerModal] Add category pressed: "${trimmed}"`);
    const updated = await addTimerCategory(trimmed);
    setTimerCategories(updated);
    const found = updated.find(c => c.name === trimmed && !c.isBuiltIn);
    if (found) setSelectedCategoryId(found.id);
    setNewCatName('');
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    let hasError = false;

    if (!trimmed) {
      setNameError('Name is required');
      hasError = true;
    } else {
      setNameError('');
    }

    const countdownMs = ((cdDays * 86400) + (cdHours * 3600) + (cdMinutes * 60) + cdSeconds) * 1000;
    const ivWorkMs = (ivWorkMin * 60 + ivWorkSec) * 1000;
    const hiitWorkMs = (hiitWorkMin * 60 + hiitWorkSec) * 1000;

    if (mode === 'countdown' && countdownMs === 0) {
      setDurationError('Duration must be greater than zero');
      hasError = true;
    } else if (mode === 'interval' && ivWorkMs === 0) {
      setDurationError('Work time must be greater than zero');
      hasError = true;
    } else if (mode === 'hiit' && hiitWorkMs === 0) {
      setDurationError('Work time must be greater than zero');
      hasError = true;
    } else {
      setDurationError('');
    }

    if (hasError) return;

    if (!edit) {
      const existingConfigs = await getTimerConfigs();
      if (!isSubscribed && existingConfigs.length >= 3) {
        console.log('[TimerModal] Timer limit reached, redirecting to paywall');
        router.push('/paywall');
        return;
      }
    }

    let config: TimerConfig;
    const id = edit ?? Math.random().toString(36).slice(2);
    const category = selectedCategoryId === 'all' ? undefined : selectedCategoryId;

    if (mode === 'countdown') {
      config = { id, name: trimmed, mode, color, category, countdownMs };
    } else if (mode === 'interval') {
      const workMs = ivWorkMs;
      const restMs = (ivRestMin * 60 + ivRestSec) * 1000;
      config = { id, name: trimmed, mode, color, category, workMs, restMs, rounds: ivRounds };
    } else {
      const workMs = hiitWorkMs;
      const restMs = (hiitRestMin * 60 + hiitRestSec) * 1000;
      config = { id, name: trimmed, mode, color, category, workMs, restMs, rounds: hiitRounds };
    }

    console.log(`[TimerModal] Saving timer config: id=${id}, name="${trimmed}", mode=${mode}, category=${category}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveTimerConfig(config);

    // Save note to AsyncStorage
    const noteTrimmed = timerNote.trim();
    if (noteTrimmed || edit) {
      console.log(`[TimerModal] Saving note for timerId=${id}`);
      await AsyncStorage.setItem(timerNoteKey(id), noteTrimmed).catch(() => {});
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Save creation-time goal text if in create mode
    if (!edit) {
      const creationGoalTrimmed = creationGoalText.trim();
      if (creationGoalTrimmed) {
        const goalType = mode === 'countdown' ? 'complete_countdown' : 'complete_all_rounds';
        const creationGoal: ItemGoal = {
          id: Math.random().toString(36).slice(2),
          itemId: id,
          itemName: trimmed,
          itemKind: 'timer',
          goalType,
          goalName: creationGoalTrimmed,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        console.log(`[TimerModal] Saving creation goal: "${creationGoalTrimmed}" for id=${id}`);
        await saveGoal(creationGoal);
        router.back();
        return;
      }
    }

    if (goalEnabled) {
      const goalType = mode === 'countdown' ? 'complete_countdown' : 'complete_all_rounds';
      const goal: ItemGoal = {
        id: existingGoal?.id ?? Math.random().toString(36).slice(2),
        itemId: id,
        itemName: trimmed,
        itemKind: 'timer',
        goalType,
        goalName: goalName.trim() || undefined,
        status: existingGoal?.status ?? 'active',
        createdAt: existingGoal?.createdAt ?? new Date().toISOString(),
      };
      console.log(`[TimerModal] Saving goal: type=${goalType}, itemId=${id}`);
      await saveGoal(goal);
    } else if (existingGoal) {
      console.log(`[TimerModal] Deleting goal for itemId=${id}`);
      await deleteGoalForItem(id);
    }

    router.back();
  };

  // ── If autoStart mode, show running view ──────────────────────────────────
  if (isAutoStart) {
    if (autoStartLoading) {
      return (
        <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textSecondary, fontSize: 15 }}>Loading timer…</Text>
        </View>
      );
    }
    if (autoStartConfig) {
      return (
        <RunningTimerView
          config={autoStartConfig}
          plannedId={plannedId}
          onClose={() => {
            console.log('[TimerModal] Running view closed');
            router.back();
          }}
        />
      );
    }
    // Config not found — fall back to create form
  }

  // 4 columns for countdown (Days, Hours, Minutes, Seconds)
  // 40px horizontal padding on each side = 80px total, plus small gaps
  const cdColWidth = Math.floor((screenWidth - 80) / 4);
  // 2 columns for interval/hiit work/rest rows
  const ivColWidth = Math.floor((screenWidth - 80) / 2);

  const canSave = name.trim().length > 0;
  const canAddCat = newCatName.trim().length > 0;
  const isEditing = Boolean(edit);
  const title = isEditing ? 'Edit Timer' : 'New Timer';

  const sectionLabel = {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textTertiary,
    paddingHorizontal: 4,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 2.5,
    lineHeight: 17,
  };

  const MODES: { value: TimerMode; label: string; Icon: React.ComponentType<{ size: number; color: string }> }[] = [
    { value: 'countdown', label: 'Countdown', Icon: Timer },
    { value: 'interval',  label: 'Interval',  Icon: Repeat },
    { value: 'hiit',      label: 'HIIT',      Icon: Zap },
  ];

  const goalTypeLabel = mode === 'countdown' ? 'Complete countdown' : 'Complete all rounds';
  const goalDescription = 'Goal achieved when the timer finishes naturally without being stopped early.';

  // ── Derived hero display values ──────────────────────────────────────────────
  const heroCountdown = formatCountdownHero(cdDays, cdHours, cdMinutes, cdSeconds);

  const ivWorkMs = (ivWorkMin * 60 + ivWorkSec) * 1000;
  const ivRestMs = (ivRestMin * 60 + ivRestSec) * 1000;
  const ivWorkDisplay = formatMsShort(ivWorkMs);
  const ivRestDisplay = formatMsShort(ivRestMs);
  const ivSummary = `${ivWorkDisplay} work · ${ivRestDisplay} rest · ${ivRounds} rounds`;

  const hiitWorkMs = (hiitWorkMin * 60 + hiitWorkSec) * 1000;
  const hiitRestMs = (hiitRestMin * 60 + hiitRestSec) * 1000;
  const hiitWorkDisplay = formatMsShort(hiitWorkMs);
  const hiitRestDisplay = formatMsShort(hiitRestMs);
  const hiitPresetName = hiitPreset === 3 ? 'Custom' : HIIT_PRESETS[hiitPreset].label;
  const hiitSummary = `${hiitWorkDisplay} work · ${hiitRestDisplay} rest · ${hiitRounds} rounds`;

  const refinedCard = {
    backgroundColor: C.surfaceSecondary,
    borderRadius: 16,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: C.border,
    borderTopColor: 'rgba(255,255,255,0.10)',
    padding: 20,
    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 20px rgba(0,0,0,0.35)',
  };

  const saveButtonBg = canSave ? color : C.surfaceSecondary;
  const saveButtonShadow = canSave ? `0 0 32px ${color}50` : undefined;
  const saveButtonTextColor = canSave ? '#000' : C.textSecondary;
  const checkmarkColor = getContrastColor(color);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
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
            onPress={() => {
              console.log('[TimerModal] Cancel pressed');
              router.back();
            }}
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
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => ({ opacity: !canSave ? 0.4 : pressed ? 0.6 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600', lineHeight: 22 }}>
              Save
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        >
          {/* ── Mode Segmented Control ─────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 4,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            {MODES.map(m => {
              const isActive = mode === m.value;
              const iconColor = isActive ? C.text : C.textSecondary;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    console.log(`[TimerModal] Mode selected: ${m.value}`);
                    setMode(m.value);
                    setDurationError('');
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 11,
                    borderCurve: 'continuous',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    backgroundColor: isActive ? C.surface : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? C.border : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                    boxShadow: isActive ? `0 0 12px ${C.primary}20` : undefined,
                  })}
                >
                  <m.Icon size={13} color={iconColor} />
                  <Text style={{ fontSize: 14, fontWeight: isActive ? '700' : '500', color: iconColor, lineHeight: 18 }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Name Input ─────────────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: C.surfaceSecondary,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: nameError ? C.danger : C.border,
              paddingVertical: 14,
              marginBottom: nameError ? 4 : 8,
              boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 3,
                height: 24,
                borderRadius: 2,
                backgroundColor: color,
                marginLeft: 0,
                flexShrink: 0,
              }}
            />
            <TextInput
              autoFocus={!isEditing}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (t.trim()) setNameError('');
              }}
              placeholder="Name this timer..."
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: '600',
                color: C.text,
                paddingHorizontal: 12,
                paddingVertical: 4,
                minHeight: 44,
                margin: 0,
                lineHeight: 24,
              }}
            />
          </View>
          {nameError !== '' && (
            <Text style={{ fontSize: 12, color: C.danger, paddingHorizontal: 4, marginBottom: 8, lineHeight: 17 }}>
              {nameError}
            </Text>
          )}
          {nameError === '' && (
            <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28, lineHeight: 19 }}>
              Give your timer a descriptive name.
            </Text>
          )}

          {/* ── Mode-specific fields ───────────────────────────────────────── */}
          {mode === 'countdown' && (
            <>
              {/* Hero Duration Display */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 40px ${color}1A`,
                  paddingVertical: 28,
                  paddingHorizontal: 20,
                  marginBottom: 20,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 56,
                    fontWeight: '800',
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    color: C.text,
                    letterSpacing: -2.0,
                    fontVariant: ['tabular-nums'],
                    textAlign: 'center',
                    lineHeight: 64,
                  }}
                >
                  {heroCountdown}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginTop: 8,
                    lineHeight: 17,
                  }}
                >
                  DURATION
                </Text>
              </View>

              <Text style={sectionLabel}>Duration</Text>
              <View
                style={{
                  ...refinedCard,
                  marginBottom: durationError ? 4 : 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  overflow: 'hidden',
                }}
              >
                <NumberInput label="Days" value={cdDays} onChange={setCdDays} max={99} colWidth={cdColWidth} />
                <NumberInput label="Hours" value={cdHours} onChange={setCdHours} max={23} colWidth={cdColWidth} />
                <NumberInput label="Min" value={cdMinutes} onChange={setCdMinutes} max={59} colWidth={cdColWidth} />
                <NumberInput label="Sec" value={cdSeconds} onChange={setCdSeconds} max={59} colWidth={cdColWidth} />
              </View>
              {durationError !== '' && (
                <Text style={{ fontSize: 12, color: C.danger, paddingHorizontal: 4, marginBottom: 24, lineHeight: 17 }}>
                  {durationError}
                </Text>
              )}
            </>
          )}

          {mode === 'interval' && (
            <>
              {/* Hero Interval Display */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 40px ${color}1A`,
                  paddingVertical: 28,
                  paddingHorizontal: 20,
                  marginBottom: 20,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: C.text,
                    textAlign: 'center',
                    lineHeight: 22,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {ivSummary}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginTop: 8,
                    lineHeight: 17,
                  }}
                >
                  WORK · REST · ROUNDS
                </Text>
              </View>

              <Text style={sectionLabel}>Work Time</Text>
              <View
                style={{
                  ...refinedCard,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  overflow: 'hidden',
                }}
              >
                <NumberInput label="Minutes" value={ivWorkMin} onChange={setIvWorkMin} max={99} colWidth={ivColWidth} />
                <NumberInput label="Seconds" value={ivWorkSec} onChange={setIvWorkSec} max={59} colWidth={ivColWidth} />
              </View>

              <Text style={sectionLabel}>Rest Time</Text>
              <View
                style={{
                  ...refinedCard,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  overflow: 'hidden',
                }}
              >
                <NumberInput label="Minutes" value={ivRestMin} onChange={setIvRestMin} max={99} colWidth={ivColWidth} />
                <NumberInput label="Seconds" value={ivRestSec} onChange={setIvRestSec} max={59} colWidth={ivColWidth} />
              </View>

              <Text style={sectionLabel}>Rounds</Text>
              <View
                style={{
                  ...refinedCard,
                  marginBottom: durationError ? 4 : 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NumberInput label="Rounds" value={ivRounds} onChange={setIvRounds} min={1} max={99} colWidth={ivColWidth} />
              </View>
              {durationError !== '' && (
                <Text style={{ fontSize: 12, color: C.danger, paddingHorizontal: 4, marginBottom: 24, lineHeight: 17 }}>
                  {durationError}
                </Text>
              )}
            </>
          )}

          {mode === 'hiit' && (
            <>
              {/* Hero HIIT Display */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 20,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 40px ${color}1A`,
                  paddingVertical: 28,
                  paddingHorizontal: 20,
                  marginBottom: 20,
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: C.text,
                    textAlign: 'center',
                    lineHeight: 24,
                  }}
                >
                  {hiitPresetName}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: C.text,
                    textAlign: 'center',
                    lineHeight: 22,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {hiitSummary}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginTop: 4,
                    lineHeight: 17,
                  }}
                >
                  WORK · REST · ROUNDS
                </Text>
              </View>

              <Text style={sectionLabel}>Preset</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {HIIT_PRESETS.map((p, idx) => {
                  const isActive = hiitPreset === idx;
                  const isCustom = idx === 3;
                  const presetSummary = isCustom ? null : `${p.workMs / 1000}s / ${p.restMs / 1000}s × ${p.rounds}`;
                  return (
                    <AnimatedPressable
                      key={p.label}
                      onPress={() => applyHiitPreset(idx)}
                      style={{
                        paddingHorizontal: 18,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        backgroundColor: isActive ? color : 'rgba(255,255,255,0.06)',
                        borderWidth: 1,
                        borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.10)',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: isActive ? '700' : '600', color: isActive ? '#000' : C.textSecondary, lineHeight: 18 }}>
                        {p.label}
                      </Text>
                      {presetSummary !== null && (
                        <Text style={{ fontSize: 10, color: isActive ? 'rgba(0,0,0,0.6)' : C.textTertiary, marginTop: 2, lineHeight: 14 }}>
                          {presetSummary}
                        </Text>
                      )}
                    </AnimatedPressable>
                  );
                })}
              </View>

              {hiitPreset === 3 && (
                <>
                  <Text style={sectionLabel}>Work Time</Text>
                  <View
                    style={{
                      ...refinedCard,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-evenly',
                      overflow: 'hidden',
                    }}
                  >
                    <NumberInput label="Minutes" value={hiitWorkMin} onChange={setHiitWorkMin} max={99} colWidth={ivColWidth} />
                    <NumberInput label="Seconds" value={hiitWorkSec} onChange={setHiitWorkSec} max={59} colWidth={ivColWidth} />
                  </View>

                  <Text style={sectionLabel}>Rest Time</Text>
                  <View
                    style={{
                      ...refinedCard,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-evenly',
                      overflow: 'hidden',
                    }}
                  >
                    <NumberInput label="Minutes" value={hiitRestMin} onChange={setHiitRestMin} max={99} colWidth={ivColWidth} />
                    <NumberInput label="Seconds" value={hiitRestSec} onChange={setHiitRestSec} max={59} colWidth={ivColWidth} />
                  </View>
                </>
              )}

              <Text style={sectionLabel}>Rounds</Text>
              <View
                style={{
                  ...refinedCard,
                  marginBottom: durationError ? 4 : 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NumberInput label="Rounds" value={hiitRounds} onChange={setHiitRounds} min={1} max={99} colWidth={ivColWidth} />
              </View>
              {durationError !== '' && (
                <Text style={{ fontSize: 12, color: C.danger, paddingHorizontal: 4, marginBottom: 24, lineHeight: 17 }}>
                  {durationError}
                </Text>
              )}
            </>
          )}

          {/* ── Color Picker ───────────────────────────────────────────────── */}
          <Text style={sectionLabel}>Color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4, marginBottom: 28, alignItems: 'center' }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: color,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 0 3px ${color}40, 0 2px 8px rgba(0,0,0,0.3)`,
              }}
            >
              <Check size={18} color={checkmarkColor} strokeWidth={3} />
            </View>
            {PALETTE.map(swatch => (
              <ColorSwatch
                key={swatch.hex}
                hex={swatch.hex}
                label={swatch.label}
                isSelected={color === swatch.hex}
                onPress={() => {
                  console.log(`[TimerModal] Color selected: ${swatch.label}`);
                  setColor(swatch.hex);
                }}
              />
            ))}
          </View>

          {/* ── Category Section ───────────────────────────────────────────── */}
          <Text style={sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}
            style={{ flexShrink: 0, marginBottom: 12 }}
          >
            {timerCategories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <AnimatedPressable
                  key={cat.id}
                  onPress={() => {
                    console.log(`[TimerModal] Category chip pressed: ${cat.id}`);
                    setSelectedCategoryId(cat.id);
                  }}
                  style={{
                    flexShrink: 0,
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
                onSubmitEditing={handleAddCategory}
                style={{ fontSize: 14, color: C.text, padding: 0, margin: 0, lineHeight: 20 }}
              />
            </View>
            <AnimatedPressable
              onPress={handleAddCategory}
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

          {/* ── Notes Section ──────────────────────────────────────────────── */}
          {(isEditing || !isEditing) && (
            <>
              <Text style={sectionLabel}>Notes</Text>
              <View
                style={{
                  backgroundColor: C.surfaceSecondary,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 28,
                  boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
                }}
              >
                <TextInput
                  value={timerNote}
                  onChangeText={(t) => {
                    setTimerNote(t);
                  }}
                  onBlur={() => {
                    if (edit) {
                      console.log(`[TimerModal] Note saved via blur for timerId=${edit}`);
                      AsyncStorage.setItem(timerNoteKey(edit), timerNote.trim()).catch(() => {});
                      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                  }}
                  placeholder="Add a note for this timer…"
                  placeholderTextColor={C.placeholder}
                  multiline
                  style={{
                    fontSize: 14,
                    color: C.text,
                    minHeight: 60,
                    maxHeight: 120,
                    lineHeight: 20,
                    padding: 0,
                    margin: 0,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            </>
          )}

          {/* ── Creation Goal Field ─────────────────────────────────────────── */}
          {!isEditing && (
            <>
              <Text style={sectionLabel}>Goal</Text>
              <View
                style={{
                  backgroundColor: C.surfaceSecondary,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingVertical: 14,
                  marginBottom: 8,
                  boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 3,
                    height: 24,
                    borderRadius: 2,
                    backgroundColor: color,
                    marginLeft: 0,
                    flexShrink: 0,
                  }}
                />
                <TextInput
                  value={creationGoalText}
                  onChangeText={(t) => {
                    console.log('[TimerModal] Creation goal text changed');
                    setCreationGoalText(t);
                  }}
                  placeholder="Goal (optional)"
                  placeholderTextColor={C.placeholder}
                  returnKeyType="done"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '500',
                    color: C.text,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    minHeight: 44,
                    margin: 0,
                    lineHeight: 22,
                  }}
                />
              </View>
              <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28, lineHeight: 19 }}>
                Optionally describe what you want to achieve with this timer.
              </Text>
            </>
          )}

          {/* ── Goal Section (edit mode) ────────────────────────────────────── */}
          {isEditing && (
            <>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: goalEnabled ? `${C.primary}40` : C.border,
                  overflow: 'hidden',
                  marginBottom: 8,
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
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
                      Track completion of this timer
                    </Text>
                  </View>
                  <Switch
                    value={goalEnabled}
                    onValueChange={(v) => {
                      console.log(`[TimerModal] Goal toggle: ${v}`);
                      setGoalEnabled(v);
                    }}
                    trackColor={{ false: C.border, true: C.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {goalEnabled && (
                  <>
                    <View style={{ height: 1, backgroundColor: C.divider }} />
                    <View style={{ padding: 14, gap: 12 }}>
                      <View>
                        <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600', marginBottom: 8, lineHeight: 17 }}>
                          Goal Name (optional)
                        </Text>
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
                            onChangeText={setGoalName}
                            placeholder="e.g. Complete Tabata"
                            placeholderTextColor={C.placeholder}
                            returnKeyType="done"
                            style={{ fontSize: 14, color: C.text, padding: 0, margin: 0, lineHeight: 20 }}
                          />
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: `${C.primary}14`,
                          borderWidth: 1,
                          borderColor: `${C.primary}40`,
                        }}
                      >
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: 2,
                            borderColor: C.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: C.primary,
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary, lineHeight: 20 }}>
                            {goalTypeLabel}
                          </Text>
                          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
                            {goalDescription}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </View>
              <Text style={{ fontSize: 12, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 24, lineHeight: 17 }}>
                Goal status is checked when the timer completes or is stopped.
              </Text>
            </>
          )}

          {/* ── Primary Save CTA ───────────────────────────────────────────── */}
          <AnimatedPressable
            onPress={handleSave}
            disabled={!canSave}
            style={{
              backgroundColor: saveButtonBg,
              borderRadius: 16,
              borderCurve: 'continuous',
              paddingVertical: 17,
              alignItems: 'center',
              marginTop: 8,
              boxShadow: saveButtonShadow,
              opacity: canSave ? 1 : 0.4,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: saveButtonTextColor, lineHeight: 22 }}>
              Save Timer
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
