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

function StatusBadge({ status }: { status: PlannedSession['status'] }) {
  const C = useColors();
  const badgeColor =
    status === 'done'
      ? '#22c55e'
      : status === 'in_progress'
      ? '#fb923c'
      : status === 'skipped'
      ? C.subtext
      : C.subtext;
  const badgeBg =
    status === 'done'
      ? 'rgba(34,197,94,0.12)'
      : status === 'in_progress'
      ? 'rgba(251,146,60,0.12)'
      : C.surfaceSecondary;
  const label =
    status === 'done'
      ? '✓ Done'
      : status === 'in_progress'
      ? 'In Progress'
      : status === 'skipped'
      ? 'Skipped'
      : 'Pending';

  return (
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
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<ItemGoal[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleStartRoutine = async (routine: Routine) => {
    console.log(`[TodayScreen] Start routine: ${routine.name}`);
    await markRoutineUsed(routine.id);
    router.push(`/stopwatch-modal?name=${encodeURIComponent(routine.name)}&color=${encodeURIComponent(routine.color)}`);
  };

  const handleCreateRoutine = () => {
    console.log('[TodayScreen] Create routine pressed');
    router.push('/routine-modal');
  };

  const handleStartPlanned = async (planned: PlannedSession) => {
    console.log(`[TodayScreen] Start planned item: id=${planned.id}, name="${planned.itemName}", type=${planned.itemType}`);
    // Mark as in_progress immediately
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
              paddingHorizontal: 16,
              paddingBottom: 20,
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: C.text,
                  letterSpacing: -0.4,
                  lineHeight: 34,
                }}
                numberOfLines={1}
              >
                {greetingText}
              </Text>
              <Text style={{ fontSize: 14, color: C.subtext, marginTop: 3 }}>
                {todayDateText}
              </Text>
            </View>
            {/* Plan button */}
            <Pressable
              onPress={handlePlanPress}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
                marginTop: 2,
                marginRight: 8,
              })}
              accessibilityLabel="Plan a session"
            >
              <CalendarDays size={18} color={C.primary} />
            </Pressable>
            {/* Add stopwatch button */}
            <Pressable
              onPress={handleAddPress}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
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
                  fontSize: 13,
                  fontWeight: '600',
                  color: C.subtext,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 10,
                  marginTop: 4,
                  marginHorizontal: 16,
                }}
              >
                Active Now
              </Text>
              <View style={{ marginHorizontal: 16, gap: 8 }}>
                {runningStopwatches.map(sw => {
                  const swColor = sw.color ?? '#22c55e';
                  const elapsedMs = getElapsedMs(sw);
                  const timeDisplay = formatTime(elapsedMs);
                  return (
                    <View
                      key={sw.id}
                      style={{
                        backgroundColor: `${swColor}12`,
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        borderWidth: 1,
                        borderColor: `${swColor}40`,
                        padding: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          backgroundColor: swColor,
                        }}
                      />
                      <View style={{ marginLeft: 4, marginRight: 12 }}>
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
                          fontSize: 22,
                          fontWeight: '700',
                          fontFamily: timerFont,
                          color: swColor,
                          fontVariant: ['tabular-nums'],
                          letterSpacing: -0.5,
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
          <View style={{ marginBottom: 24 }}>
            {/* Section header with + Plan button */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
                marginHorizontal: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: C.subtext,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
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
              <View style={{ marginHorizontal: 16 }}>
                <Pressable
                  onPress={() => {
                    console.log('[TodayScreen] Plan something button pressed (empty state)');
                    router.push('/plan-session-modal');
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: C.card,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 20,
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <CalendarDays size={28} color={C.subtext} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 }}>
                    Nothing planned for today
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      textAlign: 'center',
                      lineHeight: 18,
                      marginBottom: 14,
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
              <View
                style={{
                  marginHorizontal: 16,
                  backgroundColor: C.card,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                }}
              >
                {plannedSessions.map((planned, idx) => {
                  const isLast = idx === plannedSessions.length - 1;
                  const linkedSession =
                    planned.completedSessionId
                      ? todaySessions.find(s => s.id === planned.completedSessionId)
                      : undefined;
                  const doneText = linkedSession ? formatDuration(linkedSession.totalTime) : null;

                  return (
                    <View key={planned.id}>
                      <Pressable
                        onLongPress={() => handlePlannedLongPress(planned)}
                        delayLongPress={400}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        {/* Color dot */}
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: planned.itemColor,
                            marginRight: 10,
                          }}
                        />
                        {/* Emoji for routines */}
                        {planned.itemEmoji != null && (
                          <Text style={{ fontSize: 14, marginRight: 6 }}>{planned.itemEmoji}</Text>
                        )}
                        {/* Name + time */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: planned.status === 'skipped' ? C.subtext : C.text,
                              textDecorationLine: planned.status === 'skipped' ? 'line-through' : 'none',
                            }}
                            numberOfLines={1}
                          >
                            {planned.itemName}
                          </Text>
                          {planned.scheduledTime != null && (
                            <Text style={{ fontSize: 12, color: C.subtext, marginTop: 1 }}>
                              {planned.scheduledTime}
                            </Text>
                          )}
                          {doneText !== null && (
                            <Text style={{ fontSize: 12, color: '#22c55e', marginTop: 1 }}>
                              {doneText}
                            </Text>
                          )}
                        </View>
                        {/* Status badge or Start button */}
                        {planned.status === 'pending' ? (
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
                        ) : (
                          <StatusBadge status={planned.status} />
                        )}
                      </Pressable>
                      {!isLast && (
                        <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 32 }} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </AnimatedItem>

        {/* ── Routines ── */}
        <AnimatedItem index={3}>
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
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
              <View style={{ marginHorizontal: 16 }}>
                <Pressable
                  onPress={handleCreateRoutine}
                  style={({ pressed }) => ({
                    backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
                    borderColor: C.border, padding: 20, alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>🎯</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 }}>
                    No routines yet
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                    Create a routine to quickly start a focus block, study session, or workout
                  </Text>
                  <View style={{ marginTop: 14, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: C.primaryMuted }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>Create your first routine</Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {routines.slice(0, 6).map(routine => {
                  const startBgColor = routine.color + '22';
                  return (
                    <Pressable
                      key={routine.id}
                      onPress={() => handleStartRoutine(routine)}
                      onLongPress={() => {
                        console.log(`[TodayScreen] Long press routine: ${routine.name}`);
                        router.push(`/routine-modal?id=${routine.id}`);
                      }}
                      delayLongPress={500}
                      style={({ pressed }) => ({
                        width: 148,
                        backgroundColor: C.card,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: C.border,
                        padding: 16,
                        opacity: pressed ? 0.8 : 1,
                        borderTopWidth: 3,
                        borderTopColor: routine.color,
                      })}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 8 }}>{routine.emoji}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 }} numberOfLines={1}>
                        {routine.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>
                        {routine.durationMinutes}
                        m
                      </Text>
                      {routine.useCount > 0 && (
                        <Text style={{ fontSize: 11, color: C.subtext, marginTop: 4 }}>
                          {routine.useCount}
                          × used
                        </Text>
                      )}
                      <View style={{ marginTop: 10, backgroundColor: startBgColor, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: routine.color }}>Start</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={handleCreateRoutine}
                  style={({ pressed }) => ({
                    width: 100,
                    backgroundColor: C.card,
                    borderRadius: 16,
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
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: C.subtext,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
                marginTop: 4,
                marginHorizontal: 16,
              }}
            >
              Active Goals
            </Text>
            {activeGoals.length === 0 ? (
              <View style={{ marginHorizontal: 16 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 20,
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
                  marginHorizontal: 16,
                  backgroundColor: C.card,
                  borderRadius: 16,
                  borderCurve: 'continuous',
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
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            backgroundColor: C.primaryMuted,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}
                        >
                          <Flag size={15} color={C.primary} />
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
                fontSize: 13,
                fontWeight: '600',
                color: C.subtext,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
                marginTop: 4,
                marginHorizontal: 16,
              }}
            >
              Recent Activity
            </Text>
            {mostRecentSession === null ? (
              <View style={{ marginHorizontal: 16 }}>
                <View
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 20,
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
              <View style={{ marginHorizontal: 16 }}>
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
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      backgroundColor: mostRecentSession.color,
                    }}
                  />
                  <View style={{ padding: 16, paddingLeft: 20 }}>
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
                          letterSpacing: -0.5,
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
