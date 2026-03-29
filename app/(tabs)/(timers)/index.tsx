import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Timer,
} from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { TimerConfig, getTimerConfigs, deleteTimerConfig } from '@/utils/timer-storage';
import { formatTime } from '@/types/stopwatch';

// ─── Timer Runtime ─────────────────────────────────────────────────────────────

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

function makeInitialRuntime(config: TimerConfig): TimerRuntime {
  const phase: 'work' | 'rest' | 'countdown' = config.mode === 'countdown' ? 'countdown' : 'work';
  const remainingMs = config.mode === 'countdown'
    ? (config.countdownMs ?? 0)
    : (config.workMs ?? 0);
  return {
    configId: config.id,
    isRunning: false,
    phase,
    currentRound: 1,
    remainingMs,
    accumulatedMs: 0,
    startedAt: null,
    isComplete: false,
  };
}

function getRemainingMs(rt: TimerRuntime, config: TimerConfig): number {
  if (!rt.isRunning || rt.startedAt === null) return rt.remainingMs;
  const elapsed = Date.now() - rt.startedAt + rt.accumulatedMs;
  const phaseDuration = rt.phase === 'countdown'
    ? (config.countdownMs ?? 0)
    : rt.phase === 'work'
    ? (config.workMs ?? 0)
    : (config.restMs ?? 0);
  return Math.max(0, phaseDuration - elapsed);
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity,
        marginRight: 5,
      }}
    />
  );
}

// ─── Timer Card ───────────────────────────────────────────────────────────────

interface TimerCardProps {
  config: TimerConfig;
  runtime: TimerRuntime;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function TimerCard({ config, runtime, onStart, onPause, onReset, onDelete, onEdit }: TimerCardProps) {
  const C = useColors();
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
  const swColor = config.color;

  const remaining = getRemainingMs(runtime, config);
  const remainingDisplay = formatTime(remaining);

  const totalRounds = config.rounds ?? 1;
  const modeLabel = config.mode === 'countdown' ? 'Countdown' : config.mode === 'interval' ? 'Interval' : 'HIIT';
  const phaseLabel = runtime.phase === 'work' ? 'WORK' : runtime.phase === 'rest' ? 'REST' : '';

  const cardBg = runtime.isRunning ? `${swColor}0a` : C.card;
  const cardBorderColor = runtime.isRunning ? `${swColor}40` : C.border;

  const handleStartPause = () => {
    console.log(`[TimersScreen] TimerCard ${runtime.isRunning ? 'Pause' : 'Start'} pressed: id=${config.id}, name="${config.name}"`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (runtime.isRunning) onPause(); else onStart();
  };

  const handleReset = () => {
    console.log(`[TimersScreen] TimerCard Reset pressed: id=${config.id}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReset();
  };

  const handleDelete = () => {
    console.log(`[TimersScreen] TimerCard Delete pressed: id=${config.id}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Timer?',
      `"${config.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[TimersScreen] TimerCard Delete confirmed: id=${config.id}`);
            onDelete();
          },
        },
      ]
    );
  };

  const doneColor = '#34C759';

  return (
    <Pressable
      onLongPress={() => {
        console.log(`[TimersScreen] TimerCard Long press (edit): id=${config.id}`);
        onEdit();
      }}
      delayLongPress={400}
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    >
      <View
        style={{
          backgroundColor: runtime.isComplete ? 'rgba(52,199,89,0.06)' : cardBg,
          borderRadius: 16,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: runtime.isComplete ? 'rgba(52,199,89,0.30)' : cardBorderColor,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {runtime.isRunning && !runtime.isComplete && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: swColor,
              zIndex: 1,
            }}
          />
        )}

        <View style={{ padding: 16, paddingLeft: runtime.isRunning ? 20 : 16 }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 4 }}>
                {config.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {runtime.isRunning && <PulsingDot color={swColor} />}
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 20,
                    backgroundColor: `${swColor}22`,
                  }}
                >
                  <Text style={{ fontSize: 11, color: swColor, fontWeight: '600' }}>
                    {modeLabel}
                  </Text>
                </View>
                {config.mode !== 'countdown' && (
                  <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '500' }}>
                    {`Round ${runtime.currentRound}/${totalRounds}`}
                  </Text>
                )}
                {phaseLabel !== '' && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 20,
                      backgroundColor: runtime.phase === 'work' ? 'rgba(255,59,48,0.12)' : 'rgba(52,199,89,0.12)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: runtime.phase === 'work' ? '#FF3B30' : '#34C759',
                      }}
                    >
                      {phaseLabel}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              {runtime.isComplete ? (
                <Text style={{ fontSize: 22, fontWeight: '700', color: doneColor }}>
                  ✓ Done
                </Text>
              ) : (
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    fontFamily: timerFont,
                    color: runtime.isRunning ? swColor : C.text,
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -0.5,
                    lineHeight: 34,
                  }}
                >
                  {remainingDisplay}
                </Text>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 12 }} />

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!runtime.isComplete && (
              <Pressable
                onPress={handleStartPause}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: runtime.isRunning ? swColor : C.primary,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {runtime.isRunning
                  ? <Pause size={15} color="#fff" fill="#fff" />
                  : <Play size={15} color="#fff" fill="#fff" />
                }
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                  {runtime.isRunning ? 'Pause' : 'Start'}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                flex: runtime.isComplete ? 1 : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingHorizontal: runtime.isComplete ? undefined : 14,
                backgroundColor: C.surfaceSecondary,
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingVertical: 9,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <RotateCcw size={14} color={C.textSecondary} />
              {runtime.isComplete && (
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>
                  Reset
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.dangerMuted,
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingVertical: 9,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Trash2 size={14} color={C.danger} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimersScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [timerConfigs, setTimerConfigs] = useState<TimerConfig[]>([]);
  const [timerRuntimes, setTimerRuntimes] = useState<Record<string, TimerRuntime>>({});
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const anyTimerRunning = Object.values(timerRuntimes).some(rt => rt.isRunning);

  useFocusEffect(
    useCallback(() => {
      console.log('[TimersScreen] Focus: loading timer configs');
      getTimerConfigs().then(configs => {
        setTimerConfigs(configs);
        setTimerRuntimes(prev => {
          const next = { ...prev };
          for (const cfg of configs) {
            if (!next[cfg.id]) {
              next[cfg.id] = makeInitialRuntime(cfg);
            }
          }
          for (const id of Object.keys(next)) {
            if (!configs.find(c => c.id === id)) {
              delete next[id];
            }
          }
          return next;
        });
        console.log(`[TimersScreen] Loaded ${configs.length} timer config(s)`);
      });
    }, [])
  );

  useEffect(() => {
    if (anyTimerRunning) {
      intervalRef.current = setInterval(() => {
        setTick(t => t + 1);
        setTimerRuntimes(prev => {
          let changed = false;
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            const rt = next[id];
            if (!rt.isRunning || rt.isComplete) continue;
            const cfg = timerConfigs.find(c => c.id === id);
            if (!cfg) continue;

            const remaining = getRemainingMs(rt, cfg);
            if (remaining <= 0) {
              if (cfg.mode === 'countdown') {
                next[id] = { ...rt, isRunning: false, remainingMs: 0, isComplete: true };
                console.log(`[TimersScreen] Countdown complete: id=${id}`);
              } else {
                if (rt.phase === 'work') {
                  next[id] = {
                    ...rt,
                    phase: 'rest',
                    remainingMs: cfg.restMs ?? 0,
                    accumulatedMs: 0,
                    startedAt: Date.now(),
                  };
                  console.log(`[TimersScreen] Switching to REST: id=${id}, round=${rt.currentRound}`);
                } else {
                  const nextRound = rt.currentRound + 1;
                  const totalRounds = cfg.rounds ?? 1;
                  if (nextRound > totalRounds) {
                    next[id] = { ...rt, isRunning: false, remainingMs: 0, isComplete: true };
                    console.log(`[TimersScreen] All rounds complete: id=${id}`);
                  } else {
                    next[id] = {
                      ...rt,
                      phase: 'work',
                      currentRound: nextRound,
                      remainingMs: cfg.workMs ?? 0,
                      accumulatedMs: 0,
                      startedAt: Date.now(),
                    };
                    console.log(`[TimersScreen] Starting round ${nextRound}: id=${id}`);
                  }
                }
              }
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 100);
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
  }, [anyTimerRunning, timerConfigs]);

  const handleTimerStart = useCallback((id: string) => {
    console.log(`[TimersScreen] Timer start: id=${id}`);
    setTimerRuntimes(prev => {
      const rt = prev[id];
      if (!rt) return prev;
      return {
        ...prev,
        [id]: { ...rt, isRunning: true, startedAt: Date.now(), accumulatedMs: 0 },
      };
    });
  }, []);

  const handleTimerPause = useCallback((id: string) => {
    console.log(`[TimersScreen] Timer pause: id=${id}`);
    setTimerRuntimes(prev => {
      const rt = prev[id];
      if (!rt || !rt.isRunning || rt.startedAt === null) return prev;
      const cfg = timerConfigs.find(c => c.id === id);
      if (!cfg) return prev;
      const remaining = getRemainingMs(rt, cfg);
      const phaseDuration = rt.phase === 'countdown'
        ? (cfg.countdownMs ?? 0)
        : rt.phase === 'work'
        ? (cfg.workMs ?? 0)
        : (cfg.restMs ?? 0);
      const elapsed = phaseDuration - remaining;
      return {
        ...prev,
        [id]: { ...rt, isRunning: false, remainingMs: remaining, accumulatedMs: elapsed, startedAt: null },
      };
    });
  }, [timerConfigs]);

  const handleTimerReset = useCallback((id: string) => {
    console.log(`[TimersScreen] Timer reset: id=${id}`);
    const cfg = timerConfigs.find(c => c.id === id);
    if (!cfg) return;
    setTimerRuntimes(prev => ({ ...prev, [id]: makeInitialRuntime(cfg) }));
  }, [timerConfigs]);

  const handleTimerDelete = useCallback(async (id: string) => {
    console.log(`[TimersScreen] Timer delete: id=${id}`);
    await deleteTimerConfig(id);
    setTimerConfigs(prev => prev.filter(c => c.id !== id));
    setTimerRuntimes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const listBottomPad = insets.bottom + 100;
  const showEmpty = timerConfigs.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: C.background }}>
        <View
          style={{
            height: 44,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: C.text,
            }}
          >
            Timers
          </Text>
          <Pressable
            onPress={() => {
              console.log('[TimersScreen] Header + button pressed');
              router.push('/timer-modal');
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Plus size={20} color={C.primary} />
          </Pressable>
        </View>
        <View style={{ height: 1, backgroundColor: C.separator }} />
      </View>

      {/* Empty state */}
      {showEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              borderCurve: 'continuous',
              backgroundColor: C.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Timer size={40} color={C.primary} />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: C.text,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            No timers yet
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: C.textSecondary,
              textAlign: 'center',
              marginBottom: 28,
              lineHeight: 22,
            }}
          >
            Tap + to create your first timer
          </Text>
          <Pressable
            onPress={() => {
              console.log('[TimersScreen] Empty state "Add Timer" pressed');
              router.push('/timer-modal');
            }}
            style={({ pressed }) => ({
              backgroundColor: C.primary,
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingHorizontal: 24,
              paddingVertical: 13,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              opacity: pressed ? 0.8 : 1,
              boxShadow: '0 4px 16px rgba(0,122,255,0.30)',
            })}
          >
            <Plus size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
              Add Timer
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={timerConfigs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
          renderItem={({ item }) => {
            const rt = timerRuntimes[item.id] ?? makeInitialRuntime(item);
            return (
              <TimerCard
                config={item}
                runtime={rt}
                onStart={() => handleTimerStart(item.id)}
                onPause={() => handleTimerPause(item.id)}
                onReset={() => handleTimerReset(item.id)}
                onDelete={() => handleTimerDelete(item.id)}
                onEdit={() => {
                  console.log(`[TimersScreen] Edit timer: id=${item.id}`);
                  router.push(`/timer-modal?edit=${item.id}`);
                }}
              />
            );
          }}
        />
      )}
    </View>
  );
}
