import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Flag,
  Plus,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { getElapsedMs, formatTime, Stopwatch } from '@/types/stopwatch';
import { loadStopwatches } from '@/utils/stopwatch-storage';
import { getSessions } from '@/utils/session-storage';
import { getGoals, ItemGoal } from '@/utils/goal-storage';
import { getRoutines, markRoutineUsed, Routine } from '@/utils/routine-storage';
import { notifyRoutineComplete } from '@/utils/completion-notifications';
import { useWidget } from '@/contexts/WidgetContext';
import {
  getPlannedSessionsForDate,
  savePlannedSession,
  deletePlannedSession,
  todayDateString,
  PlannedSession,
} from '@/utils/planned-sessions-storage';
import type { Session } from '@/types/stopwatch';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFILE_NAME_KEY = '@chroniqo_profile_name';

const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// ─── Types ────────────────────────────────────────────────────────────────────

type RoutineTimerEntry = {
  startedAt: number;
  pausedAt: number | null;
  accumulatedMs: number;
  isPaused: boolean;
  isComplete: boolean;
};

type RoutineTimers = Record<string, RoutineTimerEntry>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${timeGreeting}, ${name}` : timeGreeting;
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimeOfDay(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getGoalTypeLabel(goalType: string): string {
  switch (goalType) {
    case 'target_duration': return 'Duration goal';
    case 'target_laps': return 'Laps goal';
    case 'beat_personal_best': return 'Personal best';
    case 'complete_countdown': return 'Countdown';
    case 'complete_all_rounds': return 'All rounds';
    default: return 'Goal';
  }
}

function formatMMSS(totalMs: number): string {
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function getRoutineElapsedMs(entry: RoutineTimerEntry): number {
  if (entry.isPaused || entry.isComplete) {
    return entry.accumulatedMs;
  }
  return entry.accumulatedMs + (Date.now() - entry.startedAt);
}

/** Returns true if scheduledTime (HH:MM) was more than 30 min ago today */
function isMissed(scheduledTime: string | null | undefined): boolean {
  if (!scheduledTime) return false;
  try {
    const [hStr, mStr] = scheduledTime.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return false;
    const now = new Date();
    const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    return Date.now() - scheduled.getTime() > 30 * 60 * 1000;
  } catch {
    return false;
  }
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
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
      }}
    />
  );
}

// ─── Animated List Item ───────────────────────────────────────────────────────

function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 55, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Planned Item Status Badge ────────────────────────────────────────────────

function StatusBadge({ status, withDot, dotColor }: { status: PlannedSession['status'] | 'missed'; withDot?: boolean; dotColor?: string }) {
  const C = useColors();
  const badgeColor =
    status === 'done'
      ? '#22c55e'
      : status === 'in_progress'
      ? '#fb923c'
      : status === 'skipped'
      ? C.subtext
      : status === 'missed'
      ? '#fb923c'
      : C.subtext;
  const badgeBg =
    status === 'done'
      ? 'rgba(34,197,94,0.12)'
      : status === 'in_progress'
      ? 'rgba(251,146,60,0.12)'
      : status === 'missed'
      ? 'rgba(251,146,60,0.10)'
      : C.surfaceSecondary;
  const label =
    status === 'done'
      ? '✓ Done'
      : status === 'in_progress'
      ? 'In Progress'
      : status === 'skipped'
      ? 'Skipped'
      : status === 'missed'
      ? 'Missed?'
      : 'Pending';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {withDot && dotColor != null && <PulsingDot color={dotColor} />}
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
          backgroundColor: badgeBg,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: badgeColor }}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Routine Card ─────────────────────────────────────────────────────────────

type RoutineCardProps = {
  routine: Routine;
  timerEntry: RoutineTimerEntry | undefined;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onOpen: () => void;
  onRestart: () => void;
  onLongPress: () => void;
};

function RoutineCard({
  routine,
  timerEntry,
  onStart,
  onPause,
  onResume,
  onStop,
  onOpen,
  onRestart,
  onLongPress,
}: RoutineCardProps) {
  const C = useColors();
  const totalMs = routine.durationMinutes * 60 * 1000;

  const isIdle = timerEntry == null;
  const isActive = timerEntry != null && !timerEntry.isPaused && !timerEntry.isComplete;
  const isPaused = timerEntry != null && timerEntry.isPaused && !timerEntry.isComplete;
  const isComplete = timerEntry != null && timerEntry.isComplete;

  const elapsedMs = timerEntry != null ? getRoutineElapsedMs(timerEntry) : 0;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const rawProgress = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
  const progressPercent = Math.min(100, Math.max(0, rawProgress));

  const countdownDisplay = formatMMSS(remainingMs);
  const durationLabel = `${routine.durationMinutes}m`;
  const startBgColor = routine.color + '18';

  if (isIdle) {
    return (
      <Pressable
        onPress={onStart}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={({ pressed }) => ({
          width: 148,
          minHeight: 130,
          backgroundColor: C.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
          padding: 14,
          opacity: pressed ? 0.8 : 1,
          borderTopWidth: 3,
          borderTopColor: routine.color,
        })}
      >
        {routine.emoji ? <Text style={{ fontSize: 22, marginBottom: 8 }}>{routine.emoji}</Text> : null}
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 }} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={{ fontSize: 11, color: C.textSecondary }}>
          {durationLabel}
        </Text>
        {routine.useCount > 0 && (
          <Text style={{ fontSize: 11, color: C.subtext, marginTop: 3 }}>
            {routine.useCount}
            × used
          </Text>
        )}
        <View style={{ marginTop: 10, backgroundColor: startBgColor, borderRadius: 8, paddingVertical: 7, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: routine.color }}>Start</Text>
        </View>
      </Pressable>
    );
  }

  if (isComplete) {
    return (
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={500}
        style={{
          width: 148,
          minHeight: 130,
          backgroundColor: C.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
          padding: 14,
          borderTopWidth: 3,
          borderTopColor: routine.color,
        }}
      >
        {routine.emoji ? <Text style={{ fontSize: 22, marginBottom: 6 }}>{routine.emoji}</Text> : null}
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 }} numberOfLines={1}>
          {routine.name}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: 'rgba(34,197,94,0.12)',
            alignSelf: 'flex-start',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>✓ Done</Text>
        </View>
        <Pressable
          onPress={onRestart}
          style={({ pressed }) => ({
            backgroundColor: startBgColor,
            borderRadius: 8,
            paddingVertical: 7,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: routine.color }}>Restart</Text>
        </Pressable>
      </Pressable>
    );
  }

  // Active or Paused
  return (
    <View
      style={{
        width: 148,
        minHeight: 148,
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        borderTopWidth: 3,
        borderTopColor: routine.color,
      }}
    >
      {/* Header row: emoji + name + pulsing dot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 5 }}>
        {routine.emoji ? <Text style={{ fontSize: 16 }}>{routine.emoji}</Text> : null}
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, flex: 1 }} numberOfLines={1}>
          {routine.name}
        </Text>
        {isActive && <PulsingDot color={routine.color} />}
      </View>

      {/* Countdown */}
      <Text
        style={{
          fontSize: 26,
          fontWeight: '700',
          fontFamily: timerFont,
          color: routine.color,
          fontVariant: ['tabular-nums'],
          letterSpacing: -1,
          marginBottom: 6,
        }}
      >
        {countdownDisplay}
      </Text>

      {/* Progress bar */}
      <View
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: routine.color + '28',
          marginBottom: 10,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: routine.color,
            width: `${progressPercent}%`,
          }}
        />
      </View>

      {/* Buttons */}
      {isActive ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={onPause}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: 'rgba(251,146,60,0.14)',
              borderRadius: 8,
              paddingVertical: 7,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fb923c' }}>Pause</Text>
          </Pressable>
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: startBgColor,
              borderRadius: 8,
              paddingVertical: 7,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: routine.color }}>Open</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={onResume}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: startBgColor,
              borderRadius: 8,
              paddingVertical: 7,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: routine.color }}>Resume</Text>
          </Pressable>
          <Pressable
            onPress={onStop}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: 'rgba(239,68,68,0.12)',
              borderRadius: 8,
              paddingVertical: 7,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444' }}>Stop</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pushWidgetData } = useWidget();

  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<ItemGoal[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [routineTimers, setRoutineTimers] = useState<RoutineTimers>({});
  const routineTimersRef = useRef<RoutineTimers>({});
  const routineTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync for use inside interval
  useEffect(() => {
    routineTimersRef.current = routineTimers;
  }, [routineTimers]);

  // ── Load data on focus ──
  useFocusEffect(
    useCallback(() => {
      console.log('[TodayScreen] Focus: loading dashboard data');
      const today = todayDateString();

      Promise.all([
        AsyncStorage.getItem(PROFILE_NAME_KEY),
        loadStopwatches(),
        getSessions(),
        getGoals(),
        getRoutines(),
        getPlannedSessionsForDate(today),
      ]).then(async ([name, sws, sess, gs, rts, planned]) => {
        console.log(
          `[TodayScreen] Loaded: name="${name}", ${sws.length} stopwatches, ${sess.length} sessions, ${gs.length} goals, ${rts.length} routines, ${planned.length} planned`
        );

        const todaySessions = sess.filter(s => isToday(s.startedAt));
        const completedPlannedSessionIds = new Set(
          planned.filter(p => p.completedSessionId).map(p => p.completedSessionId as string)
        );

        // Auto-reconcile in_progress planned items
        const updatedPlanned = [...planned];
        for (let i = 0; i < updatedPlanned.length; i++) {
          const p = updatedPlanned[i];
          if (p.status === 'in_progress') {
            const matchingSession = todaySessions.find(
              s => s.stopwatchName === p.itemName && !completedPlannedSessionIds.has(s.id)
            );
            if (matchingSession) {
              console.log(
                `[TodayScreen] Auto-reconcile: planned "${p.itemName}" → done (session ${matchingSession.id})`
              );
              const updated = { ...p, status: 'done' as const, completedSessionId: matchingSession.id };
              await savePlannedSession(updated);
              updatedPlanned[i] = updated;
              completedPlannedSessionIds.add(matchingSession.id);
            }
          }
        }

        setProfileName(name ?? undefined);
        setStopwatches(sws);
        setSessions(sess);
        setGoals(gs);
        setRoutines(rts);
        setPlannedSessions(updatedPlanned);

        // Push widget data with fresh loaded values
        const todayStr = todayDateString();
        const todaySessionsCount = sess.filter((s: any) => s.startedAt.slice(0, 10) === todayStr).length;
        const todayTimeMs = sess.filter((s: any) => s.startedAt.slice(0, 10) === todayStr).reduce((sum: number, s: any) => sum + (s.totalTime ?? 0), 0);
        const activeGoal = gs.find((g: any) => g.status === 'active');

        const daySet = new Set<string>();
        for (const s of sess) { daySet.add(s.startedAt.slice(0, 10)); }
        let streak = 0;
        const todayDate = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(todayDate);
          d.setDate(todayDate.getDate() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (daySet.has(key)) { streak++; } else { break; }
        }

        pushWidgetData({
          todaySessions: todaySessionsCount,
          todayTimeMs,
          activeGoalName: activeGoal?.goalName ?? activeGoal?.itemName,
          streak,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      });
    }, [])
  );

  // ── Tick for running stopwatches ──
  const anyRunning = stopwatches.some(sw => sw.isRunning);
  useEffect(() => {
    if (anyRunning) {
      tickRef.current = setInterval(() => setTick(t => t + 1), 500);
    } else {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [anyRunning]);

  // ── Tick for routine timers ──
  const anyRoutineActive = Object.values(routineTimers).some(e => !e.isPaused && !e.isComplete);
  useEffect(() => {
    if (anyRoutineActive) {
      routineTickRef.current = setInterval(() => setTick(t => t + 1), 100);
    } else {
      if (routineTickRef.current) { clearInterval(routineTickRef.current); routineTickRef.current = null; }
    }
    return () => { if (routineTickRef.current) { clearInterval(routineTickRef.current); routineTickRef.current = null; } };
  }, [anyRoutineActive]);

  // ── Check routine completion ──
  useEffect(() => {
    const timers = routineTimers;
    const updates: RoutineTimers = {};
    let hasUpdate = false;

    for (const [id, entry] of Object.entries(timers)) {
      if (!entry.isComplete && !entry.isPaused) {
        const routine = routines.find(r => r.id === id);
        if (routine) {
          const totalMs = routine.durationMinutes * 60 * 1000;
          const elapsed = getRoutineElapsedMs(entry);
          if (elapsed >= totalMs) {
            console.log(`[TodayScreen] Routine timer complete: ${routine.name}`);
            updates[id] = { ...entry, isComplete: true, accumulatedMs: totalMs };
            hasUpdate = true;
            markRoutineUsed(id).catch(() => {});
            notifyRoutineComplete(routine.name).catch(() => {});
          }
        }
      }
    }

    if (hasUpdate) {
      setRoutineTimers(prev => ({ ...prev, ...updates }));
    }
  }, [routineTimers, routines]);

  // ── Derived data ──
  const runningStopwatches = stopwatches.filter(sw => sw.isRunning);
  const todaySessions = sessions.filter(s => isToday(s.startedAt));
  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);
  const mostRecentSession = sessions.length > 0 ? sessions[0] : null;

  const isNewUser = stopwatches.length === 0 && sessions.length === 0 && goals.length === 0;

  const greetingText = getGreeting(profileName);
  const todayDateText = formatTodayDate();

  const bottomPad = insets.bottom + 100;

  // ── Handlers ──
  const handleAddPress = () => {
    console.log('[TodayScreen] Header + button pressed');
    router.push('/stopwatch-modal');
  };

  const handlePlanPress = () => {
    console.log('[TodayScreen] Header plan button pressed');
    router.push('/plan-session-modal');
  };

  const handleCreateStopwatch = () => {
    console.log('[TodayScreen] Welcome card: create stopwatch tapped');
    router.push('/stopwatch-modal');
  };

  const handleCreateTimer = () => {
    console.log('[TodayScreen] Welcome card: create timer tapped');
    router.push('/timer-modal');
  };

  const handleOpenRoutineModal = async (routine: Routine) => {
    console.log(`[TodayScreen] Open routine in stopwatch modal: ${routine.name}`);
    await markRoutineUsed(routine.id);
    router.push(`/stopwatch-modal?name=${encodeURIComponent(routine.name)}&color=${encodeURIComponent(routine.color)}`);
  };

  const handleStartRoutineCard = (routine: Routine) => {
    console.log(`[TodayScreen] Start routine card countdown: ${routine.name}`);
    setRoutineTimers(prev => ({
      ...prev,
      [routine.id]: {
        startedAt: Date.now(),
        pausedAt: null,
        accumulatedMs: 0,
        isPaused: false,
        isComplete: false,
      },
    }));
  };

  const handlePauseRoutine = (routineId: string) => {
    console.log(`[TodayScreen] Pause routine timer: ${routineId}`);
    setRoutineTimers(prev => {
      const entry = prev[routineId];
      if (!entry || entry.isPaused || entry.isComplete) return prev;
      const elapsed = getRoutineElapsedMs(entry);
      return {
        ...prev,
        [routineId]: {
          ...entry,
          pausedAt: Date.now(),
          accumulatedMs: elapsed,
          isPaused: true,
        },
      };
    });
  };

  const handleResumeRoutine = (routineId: string) => {
    console.log(`[TodayScreen] Resume routine timer: ${routineId}`);
    setRoutineTimers(prev => {
      const entry = prev[routineId];
      if (!entry || !entry.isPaused) return prev;
      return {
        ...prev,
        [routineId]: {
          ...entry,
          startedAt: Date.now(),
          pausedAt: null,
          isPaused: false,
        },
      };
    });
  };

  const handleStopRoutine = (routineId: string) => {
    console.log(`[TodayScreen] Stop routine timer: ${routineId}`);
    setRoutineTimers(prev => {
      const next = { ...prev };
      delete next[routineId];
      return next;
    });
  };

  const handleRestartRoutine = (routineId: string) => {
    console.log(`[TodayScreen] Restart routine timer: ${routineId}`);
    setRoutineTimers(prev => {
      const next = { ...prev };
      delete next[routineId];
      return next;
    });
  };

  const handleCreateRoutine = () => {
    console.log('[TodayScreen] Create routine pressed');
    router.push('/routine-modal');
  };

  const handleStartPlanned = async (planned: PlannedSession) => {
    console.log(`[TodayScreen] Start planned item: id=${planned.id}, name="${planned.itemName}", type=${planned.itemType}, status=${planned.status}`);

    // If already in_progress, navigate directly to the running session
    if (planned.status === 'in_progress') {
      if (planned.itemType === 'stopwatch' || planned.itemType === 'routine') {
        const runningMatch = stopwatches.find(sw => sw.name === planned.itemName && sw.isRunning);
        if (runningMatch) {
          console.log(`[TodayScreen] Navigating to running stopwatch: id=${runningMatch.id}`);
          router.push(`/stopwatch-modal?id=${runningMatch.id}`);
        } else {
          console.log(`[TodayScreen] No running match found, opening by name`);
          router.push(`/stopwatch-modal?name=${encodeURIComponent(planned.itemName)}&color=${encodeURIComponent(planned.itemColor)}`);
        }
      } else {
        console.log(`[TodayScreen] Navigating to in-progress timer: id=${planned.itemId}`);
        router.push(`/timer-modal?id=${planned.itemId}`);
      }
      return;
    }

    // Mark as in_progress and navigate
    const updated = { ...planned, status: 'in_progress' as const };
    await savePlannedSession(updated);
    setPlannedSessions(prev => prev.map(p => p.id === planned.id ? updated : p));

    if (planned.itemType === 'stopwatch' || planned.itemType === 'routine') {
      router.push(
        `/stopwatch-modal?name=${encodeURIComponent(planned.itemName)}&color=${encodeURIComponent(planned.itemColor)}`
      );
    } else {
      router.push(`/timer-modal?id=${planned.itemId}`);
    }
  };

  const handlePlannedLongPress = (planned: PlannedSession) => {
    console.log(`[TodayScreen] Long press planned item: id=${planned.id}, name="${planned.itemName}"`);
    Alert.alert(planned.itemName, 'What would you like to do?', [
      {
        text: 'Mark as Done',
        onPress: async () => {
          console.log(`[TodayScreen] Mark planned as done: id=${planned.id}`);
          const updated = { ...planned, status: 'done' as const };
          await savePlannedSession(updated);
          setPlannedSessions(prev => prev.map(p => p.id === planned.id ? updated : p));
        },
      },
      {
        text: 'Skip',
        onPress: async () => {
          console.log(`[TodayScreen] Skip planned item: id=${planned.id}`);
          const updated = { ...planned, status: 'skipped' as const };
          await savePlannedSession(updated);
          setPlannedSessions(prev => prev.map(p => p.id === planned.id ? updated : p));
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log(`[TodayScreen] Delete planned item: id=${planned.id}`);
          await deletePlannedSession(planned.id);
          setPlannedSessions(prev => prev.filter(p => p.id !== planned.id));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* ── Header ── */}
        <AnimatedItem index={0}>
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingHorizontal: 20,
              paddingBottom: 20,
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '800',
                  color: C.text,
                  letterSpacing: -0.8,
                  lineHeight: 38,
                }}
                numberOfLines={1}
              >
                {greetingText}
              </Text>
              <Text style={{ fontSize: 13, color: C.subtext, marginTop: 4 }}>
                {todayDateText}
              </Text>
            </View>
            {/* Plan button */}
            <Pressable
              onPress={handlePlanPress}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
                marginTop: 2,
                marginRight: 8,
              })}
              accessibilityLabel="Plan a session"
            >
              <CalendarDays size={18} color={C.icon} />
            </Pressable>
            {/* Add stopwatch button */}
            <Pressable
              onPress={handleAddPress}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: C.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
                marginTop: 2,
              })}
              accessibilityLabel="Add stopwatch"
            >
              <Plus size={20} color="#fff" />
            </Pressable>
          </View>
        </AnimatedItem>

        {/* ── Welcome (new users only) ── */}
        {isNewUser && (
          <AnimatedItem index={1}>
            <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                }}
              >
                <View style={{ padding: 16, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 }}>
                    Welcome to Chroniqo
                  </Text>
                  <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 20 }}>
                    Track your time, set goals, and build better habits.
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: C.divider }} />
                <Pressable
                  onPress={handleCreateStopwatch}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: C.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Clock size={18} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
                      Create your first stopwatch
                    </Text>
                    <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }}>
                      Start tracking any activity
                    </Text>
                  </View>
                  <ChevronRight size={18} color={C.subtext} />
                </Pressable>
                <View style={{ height: 1, backgroundColor: C.divider }} />
                <Pressable
                  onPress={handleCreateTimer}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(251,146,60,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Zap size={18} color="#fb923c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
                      Set up a timer
                    </Text>
                    <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }}>
                      Countdown, interval, or HIIT
                    </Text>
                  </View>
                  <ChevronRight size={18} color={C.subtext} />
                </Pressable>
                <View style={{ height: 1, backgroundColor: C.divider }} />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: 0.45,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(167,139,250,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <TrendingUp size={18} color="#a78bfa" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
                      Track progress over time
                    </Text>
                    <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }}>
                      Sessions and history appear here
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Active Now ── */}
        {runningStopwatches.length > 0 && (
          <AnimatedItem index={1}>
            <View style={{ marginBottom: 28 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: C.subtext,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  marginBottom: 12,
                  marginTop: 4,
                  marginHorizontal: 20,
                }}
              >
                Active Now
              </Text>
              <View style={{ marginHorizontal: 20, gap: 8 }}>
                {runningStopwatches.map(sw => {
                  const swColor = sw.color ?? '#22c55e';
                  const elapsedMs = getElapsedMs(sw);
                  const timeDisplay = formatTime(elapsedMs);
                  return (
                    <View
                      key={sw.id}
                      style={{
                        backgroundColor: C.card,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: C.border,
                        borderLeftWidth: 4,
                        borderLeftColor: swColor,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <View style={{ marginRight: 12 }}>
                        <PulsingDot color={swColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: '600', color: C.text }}
                          numberOfLines={1}
                        >
                          {sw.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                          Running
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: '700',
                          fontFamily: timerFont,
                          color: swColor,
                          fontVariant: ['tabular-nums'],
                          letterSpacing: -1,
                        }}
                      >
                        {timeDisplay}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Today's Plan ── */}
        <AnimatedItem index={2}>
          <View style={{ marginBottom: 28 }}>
            {/* Section header with + Plan button */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
                marginHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: C.subtext,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  flex: 1,
                }}
              >
                Today's Plan
              </Text>
              <Pressable
                onPress={() => {
                  console.log("[TodayScreen] + Plan button pressed in section header");
                  router.push('/plan-session-modal');
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: C.primaryMuted,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Plus size={13} color={C.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>Plan</Text>
              </Pressable>
            </View>

            {plannedSessions.length === 0 ? (
              /* Empty state */
              <View style={{ marginHorizontal: 20 }}>
                <Pressable
                  onPress={() => {
                    console.log('[TodayScreen] Plan something button pressed (empty state)');
                    router.push('/plan-session-modal');
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: C.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 28,
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      backgroundColor: C.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <CalendarDays size={28} color={C.subtext} />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>
                    Nothing planned for today
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: C.textSecondary,
                      textAlign: 'center',
                      lineHeight: 20,
                      marginBottom: 18,
                    }}
                  >
                    Plan a stopwatch, timer, or routine for today
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 9,
                      borderRadius: 20,
                      backgroundColor: C.primaryMuted,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>
                      Plan something
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              /* Planned items list */
              <View style={{ marginHorizontal: 20, gap: 8 }}>
                {plannedSessions.map((planned) => {
                  const linkedSession =
                    planned.completedSessionId
                      ? todaySessions.find(s => s.id === planned.completedSessionId)
                      : undefined;
                  const doneText = linkedSession ? formatDuration(linkedSession.totalTime) : null;

                  // Find matching running stopwatch for in_progress items
                  const matchingRunning = planned.status === 'in_progress'
                    ? stopwatches.find(sw => sw.name === planned.itemName && sw.isRunning)
                    : undefined;

                  const runningElapsedMs = matchingRunning != null ? getElapsedMs(matchingRunning) : 0;
                  const runningTotalSec = Math.floor(runningElapsedMs / 1000);
                  const runningMM = Math.floor(runningTotalSec / 60).toString().padStart(2, '0');
                  const runningSS = (runningTotalSec % 60).toString().padStart(2, '0');
                  const runningDisplay = `${runningMM}:${runningSS}`;

                  // Duration label for pending items
                  const durationLabel = planned.durationMinutes != null
                    ? `~${planned.durationMinutes}m`
                    : null;

                  // Missed check
                  const missedCheck = planned.status === 'pending' && isMissed(planned.scheduledTime);

                  const isNavigable = planned.status === 'pending' || planned.status === 'in_progress';

                  return (
                    <Pressable
                      key={planned.id}
                      onPress={isNavigable ? () => handleStartPlanned(planned) : undefined}
                      onLongPress={() => handlePlannedLongPress(planned)}
                      delayLongPress={400}
                      style={({ pressed }) => ({
                        backgroundColor: C.card,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: C.border,
                        overflow: 'hidden',
                        opacity: pressed && isNavigable ? 0.8 : 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                      })}
                    >
                      {/* Left accent bar */}
                      <View
                        style={{
                          width: 3,
                          alignSelf: 'stretch',
                          backgroundColor: planned.itemColor,
                        }}
                      />
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                        }}
                      >
                        {/* Emoji for routines */}
                        {planned.itemEmoji != null && (
                          <Text style={{ fontSize: 14, marginRight: 8 }}>{planned.itemEmoji}</Text>
                        )}
                        {/* Name + time */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '600',
                              color: planned.status === 'skipped' ? C.subtext : C.text,
                              textDecorationLine: planned.status === 'skipped' ? 'line-through' : 'none',
                            }}
                            numberOfLines={1}
                          >
                            {planned.itemName}
                          </Text>
                          {planned.scheduledTime != null && (
                            <Text style={{ fontSize: 12, color: C.subtext, marginTop: 2 }}>
                              {planned.scheduledTime}
                            </Text>
                          )}
                          {/* Duration hint for pending */}
                          {planned.status === 'pending' && durationLabel !== null && (
                            <Text style={{ fontSize: 12, color: C.subtext, marginTop: 2 }}>
                              {durationLabel}
                            </Text>
                          )}
                          {doneText !== null && (
                            <Text style={{ fontSize: 12, color: '#22c55e', marginTop: 2 }}>
                              {doneText}
                            </Text>
                          )}
                        </View>
                        {/* Status badge or Start button */}
                        {planned.status === 'pending' ? (
                          missedCheck ? (
                            <Pressable
                              onPress={() => handleStartPlanned(planned)}
                              style={({ pressed }) => ({
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 10,
                                backgroundColor: 'rgba(251,146,60,0.10)',
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fb923c' }}>
                                Missed?
                              </Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              onPress={() => handleStartPlanned(planned)}
                              style={({ pressed }) => ({
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 10,
                                backgroundColor: C.primaryMuted,
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>
                                Start
                              </Text>
                            </Pressable>
                          )
                        ) : planned.status === 'in_progress' ? (
                          matchingRunning != null ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <PulsingDot color={planned.itemColor} />
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: '700',
                                  fontFamily: timerFont,
                                  color: planned.itemColor,
                                  fontVariant: ['tabular-nums'],
                                  letterSpacing: -0.5,
                                }}
                              >
                                {runningDisplay}
                              </Text>
                            </View>
                          ) : (
                            <StatusBadge status="in_progress" withDot dotColor="#fb923c" />
                          )
                        ) : (
                          <StatusBadge status={planned.status} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </AnimatedItem>

        {/* ── Routines ── */}
        <AnimatedItem index={3}>
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginHorizontal: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 1.2, flex: 1 }}>
                Routines
              </Text>
              <Pressable
                onPress={handleCreateRoutine}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                  backgroundColor: C.primaryMuted, opacity: pressed ? 0.7 : 1,
                })}
              >
                <Plus size={13} color={C.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>New</Text>
              </Pressable>
            </View>

            {routines.length === 0 ? (
              <View style={{ marginHorizontal: 20 }}>
                <Pressable
                  onPress={handleCreateRoutine}
                  style={({ pressed }) => ({
                    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
                    borderColor: C.border, padding: 24, alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: 24, marginBottom: 10 }}>🎯</Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>
                    No routines yet
                  </Text>
                  <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                    Create a routine to quickly start a focus block, study session, or workout
                  </Text>
                  <View style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: C.primaryMuted }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>Create your first routine</Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {routines.slice(0, 6).map(routine => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    timerEntry={routineTimers[routine.id]}
                    onStart={() => handleStartRoutineCard(routine)}
                    onPause={() => handlePauseRoutine(routine.id)}
                    onResume={() => handleResumeRoutine(routine.id)}
                    onStop={() => handleStopRoutine(routine.id)}
                    onOpen={() => handleOpenRoutineModal(routine)}
                    onRestart={() => handleRestartRoutine(routine.id)}
                    onLongPress={() => {
                      console.log(`[TodayScreen] Long press routine: ${routine.name}`);
                      router.push(`/routine-modal?id=${routine.id}`);
                    }}
                  />
                ))}
                <Pressable
                  onPress={handleCreateRoutine}
                  style={({ pressed }) => ({
                    width: 96,
                    backgroundColor: C.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderStyle: 'dashed',
                    padding: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Plus size={20} color={C.subtext} />
                  <Text style={{ fontSize: 12, color: C.subtext, marginTop: 6, textAlign: 'center' }}>New Routine</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </AnimatedItem>

        {/* ── Active Goals ── */}
        <AnimatedItem index={4}>
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: C.subtext,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 12,
                marginTop: 4,
                marginHorizontal: 20,
              }}
            >
              Active Goals
            </Text>
            {activeGoals.length === 0 ? (
              <View style={{ marginHorizontal: 20 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 24,
                    alignItems: 'center',
                  }}
                >
                  <Target size={28} color={C.subtext} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 }}>
                    No active goals
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      textAlign: 'center',
                      lineHeight: 18,
                    }}
                  >
                    Set a goal on any stopwatch or timer
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={{
                  marginHorizontal: 20,
                  backgroundColor: C.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                }}
              >
                {activeGoals.map((goal, idx) => {
                  const goalLabel = getGoalTypeLabel(goal.goalType);
                  const goalName = goal.goalName ?? goal.itemName;
                  const targetText = goal.targetMs != null
                    ? formatDuration(goal.targetMs)
                    : goal.targetLaps != null
                    ? `${goal.targetLaps} laps`
                    : null;
                  const isLast = idx === activeGoals.length - 1;
                  return (
                    <View key={goal.id}>
                      <View
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: C.primaryMuted,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            <Flag size={14} color={C.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontSize: 14, fontWeight: '600', color: C.text }}
                              numberOfLines={1}
                            >
                              {goalName}
                            </Text>
                            <Text style={{ fontSize: 12, color: C.subtext, marginTop: 1 }}>
                              {goalLabel}
                            </Text>
                          </View>
                          {targetText !== null && (
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 8,
                                backgroundColor: C.primaryMuted,
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>
                                {targetText}
                              </Text>
                            </View>
                          )}
                        </View>
                        {/* Progress bar */}
                        <View style={{ height: 3, backgroundColor: C.surfaceSecondary, borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: 3, width: '40%', backgroundColor: C.primary, borderRadius: 2 }} />
                        </View>
                      </View>
                      {!isLast && (
                        <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 58 }} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </AnimatedItem>

        {/* ── Recent Activity ── */}
        <AnimatedItem index={5}>
          <View style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: C.subtext,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 12,
                marginTop: 4,
                marginHorizontal: 20,
              }}
            >
              Recent Activity
            </Text>
            {mostRecentSession === null ? (
              <View style={{ marginHorizontal: 20 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 24,
                    alignItems: 'center',
                  }}
                >
                  <TrendingUp size={28} color={C.subtext} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 }}>
                    No sessions recorded yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      textAlign: 'center',
                      lineHeight: 18,
                    }}
                  >
                    Complete a session to see your history here
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginHorizontal: 20 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderLeftWidth: 4,
                    borderLeftColor: mostRecentSession.color,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 }}
                          numberOfLines={1}
                        >
                          {mostRecentSession.stopwatchName}
                        </Text>
                        <Text style={{ fontSize: 13, color: C.textSecondary }}>
                          {formatTimeOfDay(mostRecentSession.startedAt)}
                          {isToday(mostRecentSession.startedAt) ? ' · Today' : ` · ${new Date(mostRecentSession.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </Text>
                        {mostRecentSession.laps.length > 0 && (
                          <Text style={{ fontSize: 12, color: C.subtext, marginTop: 3 }}>
                            {mostRecentSession.laps.length}
                            {' '}
                            {mostRecentSession.laps.length === 1 ? 'lap' : 'laps'}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: '700',
                          fontFamily: timerFont,
                          color: mostRecentSession.color,
                          fontVariant: ['tabular-nums'],
                          letterSpacing: -1,
                        }}
                      >
                        {formatDuration(mostRecentSession.totalTime)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </AnimatedItem>
      </ScrollView>
    </View>
  );
}
