import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/constants/Colors';
import { getSessions } from '@/utils/session-storage';
import { getGoals } from '@/utils/goal-storage';
import { getRoutines } from '@/utils/routine-storage';
import { Session } from '@/types/stopwatch';
import { ItemGoal } from '@/utils/goal-storage';
import { Routine } from '@/utils/routine-storage';
import { Settings, User, TrendingUp, Trophy, Target } from 'lucide-react-native';
import { AmbientBackground } from '@/components/AmbientBackground';

const PROFILE_NAME_KEY = '@chroniqo_profile_name';

function formatTotalTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const daySet = new Set<string>();
  for (const s of sessions) {
    daySet.add(s.startedAt.slice(0, 10));
  }
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (daySet.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getLast7Days(): { label: string; dateKey: string }[] {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : dayNames[d.getDay()];
    days.push({ label, dateKey });
  }
  return days;
}

interface TopStopwatch {
  id: string;
  name: string;
  color: string;
  sessionCount: number;
  totalTime: number;
}

export default function ProfileScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<ItemGoal[]>([]);
  const [, setRoutines] = useState<Routine[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        console.log('[ProfileScreen] Focus — loading profile data');
        const [storedName, loadedSessions, loadedGoals, loadedRoutines] = await Promise.all([
          AsyncStorage.getItem(PROFILE_NAME_KEY),
          getSessions(),
          getGoals(),
          getRoutines(),
        ]);
        setName(storedName ?? '');
        setSessions(loadedSessions);
        setGoals(loadedGoals);
        setRoutines(loadedRoutines);
        console.log(
          `[ProfileScreen] Loaded: name="${storedName}", sessions=${loadedSessions.length}, goals=${loadedGoals.length}, routines=${loadedRoutines.length}`
        );
      };
      load();
    }, [])
  );

  const handleNameBlur = async () => {
    const trimmed = name.trim();
    console.log(`[ProfileScreen] Name field blur — saving name: "${trimmed}"`);
    await AsyncStorage.setItem(PROFILE_NAME_KEY, trimmed);
    setName(trimmed);
  };

  const handleSettingsPress = () => {
    console.log('[ProfileScreen] Settings gear icon pressed');
    router.push('/settings');
  };

  const totalSessions = sessions.length;
  const totalTimeMs = sessions.reduce((acc, s) => acc + (s.totalTime ?? 0), 0);
  const totalTimeDisplay = formatTotalTime(totalTimeMs);
  const goalsAchieved = goals.filter(g => g.status === 'achieved').length;
  const goalsActive = goals.filter(g => g.status === 'active').length;
  const goalsMissed = goals.filter(g => g.status === 'missed').length;
  const completionRate = (goalsAchieved + goalsMissed) > 0
    ? Math.round((goalsAchieved / (goalsAchieved + goalsMissed)) * 100)
    : 0;

  const stopwatchMap = new Map<string, TopStopwatch>();
  for (const s of sessions) {
    const existing = stopwatchMap.get(s.stopwatchId);
    if (existing) {
      existing.sessionCount += 1;
      existing.totalTime += s.totalTime ?? 0;
    } else {
      stopwatchMap.set(s.stopwatchId, {
        id: s.stopwatchId,
        name: s.stopwatchName,
        color: s.color,
        sessionCount: 1,
        totalTime: s.totalTime ?? 0,
      });
    }
  }
  const topStopwatches = Array.from(stopwatchMap.values())
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 3);

  const streak = computeStreak(sessions);

  const bestSession = sessions.length > 0
    ? sessions.reduce((best, s) => (s.totalTime ?? 0) > (best.totalTime ?? 0) ? s : best, sessions[0])
    : null;

  const last7Days = getLast7Days();
  const sessionsByDay: Record<string, number> = {};
  for (const s of sessions) {
    const key = s.startedAt.slice(0, 10);
    sessionsByDay[key] = (sessionsByDay[key] ?? 0) + 1;
  }
  const chartData = last7Days.map(d => ({
    label: d.label,
    count: sessionsByDay[d.dateKey] ?? 0,
  }));
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const hasData = totalSessions > 0 || goals.length > 0 || name.trim().length > 0;
  const trimmedName = name.trim();
  const avatarInitial = trimmedName.length > 0 ? trimmedName[0].toUpperCase() : null;
  const editHintVisible = trimmedName.length === 0;
  const avatarBg = C.primaryMuted;

  const sectionTitle = (label: string) => (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        color: C.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 2.0,
        paddingHorizontal: 20,
        marginBottom: 10,
        marginTop: 28,
      }}
    >
      {label}
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <AmbientBackground />
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: C.background,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ flex: 1, fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.8 }}>
          Profile
        </Text>
        <Pressable
          onPress={handleSettingsPress}
          style={({ pressed }) => ({
            width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, backgroundColor: C.surfaceSecondary, opacity: pressed ? 0.7 : 1,
            borderWidth: 1, borderColor: C.border,
          })}
        >
          <Settings size={20} color={C.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card */}
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: C.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              width: 68, height: 68, borderRadius: 34,
              backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,212,255,0.2)',
            }}
          >
            {avatarInitial ? (
              <Text style={{ fontSize: 28, fontWeight: '700', color: C.primary }}>{avatarInitial}</Text>
            ) : (
              <User size={28} color={C.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={handleNameBlur}
              onSubmitEditing={handleNameBlur}
              placeholder="Your name"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              style={{
                fontSize: 20, fontWeight: '600', color: C.text,
                padding: 0, paddingVertical: Platform.OS === 'ios' ? 2 : 0,
              }}
            />
            {editHintVisible && (
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                Tap to edit your name
              </Text>
            )}
          </View>
        </View>

        {/* Empty state */}
        {!hasData && (
          <View
            style={{
              marginHorizontal: 20, marginTop: 24, backgroundColor: C.surface,
              borderRadius: 16, borderWidth: 1, borderColor: C.border,
              padding: 28, alignItems: 'center',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <TrendingUp size={36} color={C.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 6, textAlign: 'center' }}>
              Your profile is empty
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Start tracking sessions and your stats will appear here
            </Text>
          </View>
        )}

        {hasData && (
          <>
            {/* Stats Summary */}
            {sectionTitle('Your Stats')}
            <View style={{ marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <StatChip label="Total Sessions" value={String(totalSessions)} C={C} />
              <StatChip label="Total Time" value={totalTimeDisplay} C={C} />
              <StatChip label="Goals Achieved" value={String(goalsAchieved)} C={C} accent="#22c55e" />
              <StatChip label="Active Goals" value={String(goalsActive)} C={C} accent={C.primary} />
            </View>

            {/* Streak + Best Session */}
            {totalSessions > 0 && (
              <>
                {sectionTitle('Highlights')}
                <View style={{ marginHorizontal: 16, flexDirection: 'row', gap: 10 }}>
                  {/* Streak card */}
                  <View
                    style={{
                      flex: 1, backgroundColor: C.surface, borderRadius: 14,
                      borderWidth: 1, borderColor: C.border, padding: 16,
                      alignItems: 'center',
                      boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(251,146,60,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <TrendingUp size={18} color="#fb923c" />
                    </View>
                    <Text
                      style={{
                        fontSize: 28, fontWeight: '800',
                        color: streak > 0 ? '#fb923c' : C.textSecondary,
                        fontVariant: ['tabular-nums'], marginTop: 4,
                      }}
                    >
                      {streak}
                    </Text>
                    <Text style={{ fontSize: 10, color: C.subtext, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Day Streak
                    </Text>
                  </View>

                  {/* Best session card */}
                  {bestSession && (
                    <View
                      style={{
                        flex: 1, backgroundColor: C.surface, borderRadius: 14,
                        borderWidth: 1, borderColor: C.border, padding: 16,
                        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Trophy size={14} color="#fbbf24" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: C.subtext, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                          Best Session
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 20, fontWeight: '800', color: C.primary,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatTotalTime(bestSession.totalTime ?? 0)}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }} numberOfLines={1}>
                        {bestSession.stopwatchName}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.subtext, marginTop: 1 }}>
                        {formatShortDate(bestSession.startedAt)}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* 7-Day Activity Chart */}
            {totalSessions > 0 && (
              <>
                {sectionTitle('Last 7 Days')}
                <View
                  style={{
                    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14,
                    borderWidth: 1, borderColor: C.border, padding: 16,
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
                    {chartData.map((d, i) => {
                      const barH = d.count > 0 ? Math.max(8, Math.round((d.count / maxCount) * 56)) : 3;
                      const isToday = i === 6;
                      const barColor = isToday ? C.primary : `${C.primary}66`;
                      const countLabel = String(d.count);
                      const dayLabel = d.label === 'Today' ? 'Now' : d.label.slice(0, 3);
                      return (
                        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                          {d.count > 0 && (
                            <Text style={{ fontSize: 9, fontWeight: '700', color: isToday ? C.primary : C.textSecondary, marginBottom: 2 }}>
                              {countLabel}
                            </Text>
                          )}
                          <View
                            style={{
                              width: '100%', height: barH,
                              backgroundColor: d.count > 0 ? barColor : C.surfaceSecondary,
                              borderRadius: 4,
                            }}
                          />
                          <Text style={{ fontSize: 9, color: C.subtext, marginTop: 5, fontWeight: isToday ? '700' : '400' }}>
                            {dayLabel}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Goals Summary */}
            {goals.length > 0 && (
              <>
                {sectionTitle('Goals')}
                <View style={{ marginHorizontal: 16, flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      flex: 1, backgroundColor: C.surface, borderRadius: 14,
                      borderWidth: 1, borderColor: C.border, padding: 14,
                      alignItems: 'center',
                      boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Trophy size={15} color="#22c55e" />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#22c55e', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                      {goalsAchieved}
                    </Text>
                    <Text style={{ fontSize: 10, color: C.subtext, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Achieved
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1, backgroundColor: C.surface, borderRadius: 14,
                      borderWidth: 1, borderColor: C.border, padding: 14,
                      alignItems: 'center',
                      boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <TrendingUp size={15} color={C.primary} />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary, marginTop: 4, fontVariant: ['tabular-nums'] }}>
                      {completionRate}
                      <Text style={{ fontSize: 14, fontWeight: '600' }}>%</Text>
                    </Text>
                    <Text style={{ fontSize: 10, color: C.subtext, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Completion
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1, backgroundColor: C.surface, borderRadius: 14,
                      borderWidth: 1, borderColor: C.border, padding: 14,
                      alignItems: 'center',
                      boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Target size={15} color={C.primary} />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary, marginTop: 4, fontVariant: ['tabular-nums'] }}>
                      {goalsActive}
                    </Text>
                    <Text style={{ fontSize: 10, color: C.subtext, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Active
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Most Used */}
            {topStopwatches.length > 0 && (
              <>
                {sectionTitle('Most Used')}
                <View
                  style={{
                    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14,
                    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {topStopwatches.map((sw, idx) => {
                    const sessionCountLabel = sw.sessionCount === 1 ? '1 session' : `${sw.sessionCount} sessions`;
                    const timeLabel = formatTotalTime(sw.totalTime);
                    const isLast = idx === topStopwatches.length - 1;
                    const sharePercent = totalTimeMs > 0 ? Math.round((sw.totalTime / totalTimeMs) * 100) : 0;
                    const shareWidth = `${sharePercent}%` as `${number}%`;
                    return (
                      <View key={sw.id}>
                        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sw.color || C.primary }} />
                            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: C.text }} numberOfLines={1}>
                              {sw.name}
                            </Text>
                            <Text style={{ fontSize: 13, color: C.textSecondary, marginRight: 8 }}>
                              {sessionCountLabel}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>
                              {timeLabel}
                            </Text>
                          </View>
                          <View style={{ height: 3, backgroundColor: C.surfaceSecondary, borderRadius: 2, marginLeft: 20, overflow: 'hidden' }}>
                            <View style={{ height: 3, width: shareWidth, backgroundColor: sw.color || C.primary, borderRadius: 4 }} />
                          </View>
                        </View>
                        {!isLast && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 38 }} />}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface StatChipProps {
  label: string;
  value: string;
  C: ReturnType<typeof useColors>;
  accent?: string;
}

function StatChip({ label, value, C, accent }: StatChipProps) {
  return (
    <View
      style={{
        flex: 1, minWidth: '46%', backgroundColor: C.surface,
        borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <Text
        style={{
          fontSize: 10, fontWeight: '700', color: C.textTertiary,
          textTransform: 'uppercase', letterSpacing: 2.0, marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 24, fontWeight: '800',
          color: accent ?? C.primary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
