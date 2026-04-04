import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  BarChart2,
  Flag,
  Zap,
  TrendingDown,
  TrendingUp,
  Timer,
  Target,
  Share2,
  Tag,
  Calendar,
  ChevronDown,
} from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, Lap, formatTime } from '@/types/stopwatch';
import { getSessions } from '@/utils/session-storage';
import { getGoals, ItemGoal, GoalStatus } from '@/utils/goal-storage';
import { getRoutines, Routine } from '@/utils/routine-storage';
import { AmbientBackground } from '@/components/AmbientBackground';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Completion {
  id: string;
  sessionName: string;
  durationMs: number;
  focusRating: number;
  note: string;
  completedAt: string;
  routineId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7Days(): { label: string; dateKey: string }[] {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const label = dayNames[d.getDay()];
    days.push({ label, dateKey });
  }
  return days;
}

function formatTimeShort(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h${minutes % 60 > 0 ? `${minutes % 60}m` : ''}`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSec}s`;
}

function formatAvgSession(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function getMostActiveDayOfWeek(sessions: Session[]): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    counts[d.getDay()] += 1;
  }
  const maxIdx = counts.indexOf(Math.max(...counts));
  return dayNames[maxIdx];
}

function getLongestSession(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  return Math.max(...sessions.map(s => s.totalTime));
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
  return mon;
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
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Stats computation ────────────────────────────────────────────────────────

interface StatsData {
  totalTime: number;
  totalSessions: number;
  totalLaps: number;
  fastestLap: Lap | null;
  slowestLap: Lap | null;
  avgLapTime: number;
  mostUsedCategory: string | null;
  perStopwatch: { id: string; name: string; color: string; sessions: number; totalTime: number }[];
}

function computeStats(sessions: Session[]): StatsData {
  let totalTime = 0;
  let totalLaps = 0;
  let allLaps: Lap[] = [];
  const swMap: Record<string, { name: string; color: string; sessions: number; totalTime: number }> = {};
  const catCount: Record<string, number> = {};

  for (const s of sessions) {
    totalTime += s.totalTime;
    const laps = s.laps ?? [];
    totalLaps += laps.length;
    allLaps = allLaps.concat(laps);

    const key = s.stopwatchId;
    if (!swMap[key]) {
      swMap[key] = { name: s.stopwatchName, color: s.color, sessions: 0, totalTime: 0 };
    }
    swMap[key].sessions += 1;
    swMap[key].totalTime += s.totalTime;

    if (s.category) {
      catCount[s.category] = (catCount[s.category] ?? 0) + 1;
    }
  }

  let fastestLap: Lap | null = null;
  let slowestLap: Lap | null = null;
  let avgLapTime = 0;

  if (allLaps.length > 0) {
    fastestLap = allLaps.reduce((a, b) => a.lapTime < b.lapTime ? a : b);
    slowestLap = allLaps.reduce((a, b) => a.lapTime > b.lapTime ? a : b);
    avgLapTime = allLaps.reduce((sum, l) => sum + l.lapTime, 0) / allLaps.length;
  }

  let mostUsedCategory: string | null = null;
  let maxCatCount = 0;
  for (const [cat, count] of Object.entries(catCount)) {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostUsedCategory = cat;
    }
  }

  const perStopwatch = Object.entries(swMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.totalTime - a.totalTime);

  return { totalTime, totalSessions: sessions.length, totalLaps, fastestLap, slowestLap, avgLapTime, mostUsedCategory, perStopwatch };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  iconNode?: React.ReactNode;
  iconBgColor?: string;
}

function StatCard({ label, value, sub, accent, iconNode, iconBgColor }: StatCardProps) {
  const C = useColors();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        // @ts-expect-error borderCurve
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        flex: 1,
        gap: 6,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {iconNode && iconBgColor ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: iconBgColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {iconNode}
          </View>
        ) : null}
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 2.0, flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: accent ?? C.primary,
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={{ fontSize: 12, color: C.subtext }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Mini Stat Chip ───────────────────────────────────────────────────────────

function MiniStatChip({ label, value }: { label: string; value: string }) {
  const C = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 12,
        // @ts-expect-error borderCurve
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        alignItems: 'center',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 2.0, marginBottom: 6 }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: C.text,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Week Stat ────────────────────────────────────────────────────────────────

function WeekStat({ label, value }: { label: string; value: string }) {
  const C = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          color: C.primary,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontVariant: ['tabular-nums'],
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: C.subtext, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Per-Stopwatch Row ────────────────────────────────────────────────────────

function SwStatRow({
  name,
  color,
  sessionCount,
  totalTime,
  totalTimeAll,
}: {
  name: string;
  color: string;
  sessionCount: number;
  totalTime: number;
  totalTimeAll: number;
}) {
  const C = useColors();
  const totalTimeDisplay = formatTime(totalTime);
  const sessionLabel = `${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
  const sharePercent = totalTimeAll > 0 ? Math.round((totalTime / totalTimeAll) * 100) : 0;
  const barWidth = `${sharePercent}%` as `${number}%`;

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{name}</Text>
          <Text style={{ fontSize: 12, color: C.subtext }}>{sessionLabel}</Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            color: C.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {totalTimeDisplay}
        </Text>
      </View>
      <View style={{ height: 3, backgroundColor: C.surfaceSecondary, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
        <View style={{ height: 3, width: barWidth, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number; subLabel?: string }[];
  maxBarHeight?: number;
  barColor: string;
  formatValue?: (v: number) => string;
}

function BarChart({ data, maxBarHeight = 80, barColor, formatValue }: BarChartProps) {
  const C = useColors();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: maxBarHeight + 52 }}>
      {data.map((item, idx) => {
        const barH = item.value > 0 ? Math.max(4, Math.round((item.value / maxValue) * maxBarHeight)) : 0;
        const valueLabel = item.value > 0 ? (formatValue ? formatValue(item.value) : String(item.value)) : '';
        return (
          <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            {valueLabel !== '' && (
              <Text style={{ fontSize: 9, fontWeight: '600', color: barColor, marginBottom: 3 }} numberOfLines={1}>
                {valueLabel}
              </Text>
            )}
            <View
              style={{
                width: '100%',
                height: barH > 0 ? barH : 2,
                backgroundColor: barH > 0 ? barColor : C.divider,
                borderRadius: 4,
                opacity: barH > 0 ? 1 : 0.3,
                overflow: 'hidden',
              }}
            >
              {barH > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: Math.max(2, Math.round(barH * 0.35)),
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    borderRadius: 4,
                  }}
                />
              )}
            </View>
            <Text style={{ fontSize: 10, color: C.textSecondary, marginTop: 5, fontWeight: '500' }}>
              {item.label}
            </Text>
            {item.subLabel ? (
              <Text style={{ fontSize: 9, color: C.subtext, marginTop: 1 }} numberOfLines={1}>
                {item.subLabel}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ─── Goal Progress Bar ────────────────────────────────────────────────────────

function GoalProgressBar({ status, color }: { status: GoalStatus; color: string }) {
  const C = useColors();
  const fillPercent = status === 'achieved' ? 1 : status === 'missed' ? 0 : 0.4;
  const fillColor = status === 'achieved' ? '#34C759' : status === 'missed' ? '#FF6B6B' : color;
  const fillWidth = `${fillPercent * 100}%` as `${number}%`;
  return (
    <View style={{ height: 4, backgroundColor: C.surfaceSecondary, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
      <View style={{ height: 4, width: fillWidth, backgroundColor: fillColor, borderRadius: 2 }} />
    </View>
  );
}

// ─── Goal Row ─────────────────────────────────────────────────────────────────

function GoalRow({ goal }: { goal: ItemGoal }) {
  const C = useColors();

  const goalTypeText = (() => {
    switch (goal.goalType) {
      case 'target_duration':
        return goal.targetMs != null ? `Target: ${formatTime(goal.targetMs)}` : 'Target Duration';
      case 'target_laps':
        return goal.targetLaps != null ? `Target: ${goal.targetLaps} laps` : 'Target Laps';
      case 'beat_personal_best':
        return goal.personalBestMs != null ? `Beat: ${formatTime(goal.personalBestMs)}` : 'Beat Personal Best';
      case 'complete_countdown':
        return 'Complete countdown';
      case 'complete_all_rounds':
        return 'Complete all rounds';
      default:
        return 'Goal';
    }
  })();

  const primaryLabel = goal.goalName ? goal.goalName : goal.itemName;
  const statusColor = goal.status === 'achieved' ? '#34C759' : goal.status === 'missed' ? '#FF6B6B' : C.primary;
  const statusLabel = goal.status === 'achieved' ? 'Achieved' : goal.status === 'missed' ? 'Missed' : 'Active';
  const statusBg = goal.status === 'achieved' ? 'rgba(52,199,89,0.12)' : goal.status === 'missed' ? 'rgba(255,107,107,0.12)' : `${C.primary}14`;

  let achievedDateLabel = '';
  if (goal.achievedAt) {
    try {
      const d = new Date(goal.achievedAt);
      achievedDateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      achievedDateLabel = '';
    }
  }

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
            {primaryLabel}
          </Text>
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
            {goalTypeText}
          </Text>
          {achievedDateLabel !== '' && (
            <Text style={{ fontSize: 11, color: '#34C759', marginTop: 2 }}>
              {achievedDateLabel}
            </Text>
          )}
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: statusBg }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <GoalProgressBar status={goal.status} color={C.primary} />
    </View>
  );
}

// ─── Goals Section ────────────────────────────────────────────────────────────

function GoalsSection({
  goals,
  sectionLabel,
  activeGoals,
  achievedGoals,
  missedGoals,
  completionRate,
}: {
  goals: ItemGoal[];
  sectionLabel: object;
  activeGoals: number;
  achievedGoals: number;
  missedGoals: number;
  completionRate: string;
}) {
  const C = useColors();

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 24, marginBottom: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 2.0, flex: 1 }}>
          Goals
        </Text>
        <Target size={14} color={C.textSecondary} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 }}>
        <StatCard label="Active" value={String(activeGoals)} accent={C.primary} />
        <StatCard label="Achieved" value={String(achievedGoals)} accent="#34C759" />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 }}>
        <StatCard label="Missed" value={String(missedGoals)} accent="#FF6B6B" />
        <StatCard label="Completion" value={completionRate} />
      </View>

      {goals.length > 0 ? (
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: C.surface,
            borderRadius: 14,
            // @ts-expect-error borderCurve
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {goals.map((goal, idx) => (
            <View key={goal.id} style={idx === goals.length - 1 ? { borderBottomWidth: 0 } : {}}>
              <GoalRow goal={goal} />
            </View>
          ))}
        </View>
      ) : (
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: C.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            padding: 24,
            alignItems: 'center',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <Target size={28} color={C.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
            No goals set yet
          </Text>
          <Text style={{ fontSize: 12, color: C.subtext, marginTop: 4, textAlign: 'center' }}>
            Add goals in the stopwatch or timer edit screen
          </Text>
        </View>
      )}
    </>
  );
}

// ─── Weekly Review Card ───────────────────────────────────────────────────────

function WeeklyReviewCard({
  sessions,
  completions,
  routines,
}: {
  sessions: Session[];
  completions: Completion[];
  routines: Routine[];
}) {
  const C = useColors();
  const weekStart = getWeekStart();
  const weekStartDateStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

  const weekSessions = sessions.filter(s => s.startedAt.slice(0, 10) >= weekStartDateStr);
  const weekTimeMs = weekSessions.reduce((sum, s) => sum + s.totalTime, 0);
  const weekTimeDisplay = weekTimeMs > 0 ? formatTimeShort(weekTimeMs) : '0m';
  const weekSessionCount = weekSessions.length;
  const streak = computeStreak(sessions);
  const streakDisplay = `${streak}d`;

  const weekCompletions = completions.filter(c => c.completedAt.slice(0, 10) >= weekStartDateStr);
  const routineUsageMap: Record<string, number> = {};
  for (const c of weekCompletions) {
    if (c.routineId) {
      routineUsageMap[c.routineId] = (routineUsageMap[c.routineId] ?? 0) + 1;
    }
  }
  const topRoutines = Object.entries(routineUsageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id, count]) => {
      const routine = routines.find(r => r.id === id);
      return { name: routine ? routine.name : 'Unknown', count };
    });

  const weekReflections = weekCompletions
    .filter(c => c.note || c.focusRating > 0)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 2);

  const dividerColor = C.divider;

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        marginHorizontal: 16,
        padding: 16,
        marginBottom: 28,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
        <Calendar size={15} color={C.primary} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, letterSpacing: 0.2 }}>
          This Week
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <WeekStat label="Focused" value={weekTimeDisplay} />
        <WeekStat label="Sessions" value={String(weekSessionCount)} />
        <WeekStat label="Streak" value={streakDisplay} />
      </View>

      <View style={{ height: 1, backgroundColor: dividerColor, marginBottom: 12 }} />

      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 2.0, marginBottom: 8 }}>
        Routine Usage
      </Text>
      {topRoutines.length > 0 ? (
        topRoutines.map((r, i) => {
          const sessionCountLabel = `${r.count} session${r.count !== 1 ? 's' : ''}`;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, flex: 1 }} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={{ fontSize: 12, color: C.subtext }}>
                {sessionCountLabel}
              </Text>
            </View>
          );
        })
      ) : (
        <Text style={{ fontSize: 13, color: C.subtext, marginBottom: 4 }}>
          No routines used this week
        </Text>
      )}

      <View style={{ height: 1, backgroundColor: dividerColor, marginTop: 10, marginBottom: 12 }} />

      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 2.0, marginBottom: 8 }}>
        Recent Reflections
      </Text>
      {weekReflections.length > 0 ? (
        weekReflections.map((r, i) => {
          const stars = buildStars(r.focusRating);
          const dateLabel = formatShortDate(r.completedAt);
          return (
            <View key={i} style={{ marginBottom: i < weekReflections.length - 1 ? 8 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontSize: 13, letterSpacing: 1 }}>
                  {stars}
                </Text>
                <Text style={{ fontSize: 11, color: C.subtext }}>
                  {dateLabel}
                </Text>
              </View>
              {r.note ? (
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }} numberOfLines={1}>
                  {r.note}
                </Text>
              ) : null}
            </View>
          );
        })
      ) : (
        <Text style={{ fontSize: 13, color: C.subtext }}>
          No reflections this week
        </Text>
      )}
    </View>
  );
}

function buildStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  const filled = '★'.repeat(clamped);
  const empty = '☆'.repeat(5 - clamped);
  return filled + empty;
}

// ─── Session History Row ──────────────────────────────────────────────────────

function SessionHistoryRow({ session }: { session: Session }) {
  const C = useColors();
  const durationDisplay = formatTime(session.totalTime);
  const lapLabel = session.laps && session.laps.length > 0
    ? `${session.laps.length} lap${session.laps.length !== 1 ? 's' : ''} · `
    : '';
  const dateLabel = formatDateTime(session.startedAt);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: session.color || C.primary,
          marginRight: 10,
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
          {session.stopwatchName}
        </Text>
        <Text style={{ fontSize: 12, color: C.subtext, marginTop: 1 }} numberOfLines={1}>
          {lapLabel}
          {dateLabel}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: C.text,
          fontVariant: ['tabular-nums'],
          marginLeft: 8,
        }}
      >
        {durationDisplay}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [goals, setGoals] = useState<ItemGoal[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      console.log('[InsightsScreen] Focus: loading sessions, goals, routines, completions');
      Promise.all([
        getSessions(),
        getGoals(),
        getRoutines(),
        AsyncStorage.getItem('@chroniqo_completions'),
      ]).then(([sessionData, goalData, routineData, completionsRaw]) => {
        let parsedCompletions: Completion[] = [];
        try {
          parsedCompletions = completionsRaw ? JSON.parse(completionsRaw) : [];
        } catch {
          parsedCompletions = [];
        }
        setAllSessions(sessionData);
        setGoals(goalData);
        setRoutines(routineData);
        setCompletions(parsedCompletions);
        setIsLoaded(true);
        console.log(
          `[InsightsScreen] Loaded ${sessionData.length} session(s), ${goalData.length} goal(s), ` +
          `${routineData.length} routine(s), ${parsedCompletions.length} completion(s)`
        );
      });
    }, [])
  );

  const uniqueNames = Array.from(new Set(allSessions.map(s => s.stopwatchName))).slice(0, 4);
  const filterChips = ['All', ...uniqueNames];

  const sessions = activeFilter === 'All'
    ? allSessions
    : allSessions.filter(s => s.stopwatchName === activeFilter);

  const activeGoals = goals.filter(g => g.status === 'active').length;
  const achievedGoals = goals.filter(g => g.status === 'achieved').length;
  const missedGoals = goals.filter(g => g.status === 'missed').length;
  const totalGoalsChecked = achievedGoals + missedGoals;
  const completionRateNum = totalGoalsChecked > 0 ? Math.round((achievedGoals / totalGoalsChecked) * 100) : 0;
  const completionRate = totalGoalsChecked > 0 ? `${completionRateNum}%` : '—';

  const stats = sessions.length > 0 ? computeStats(sessions) : null;
  const totalTimeDisplay = stats ? formatTime(stats.totalTime) : '0:00';

  const weekStart = getWeekStart();
  const weekStartDateStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  const weekSessions = allSessions.filter(s => s.startedAt.slice(0, 10) >= weekStartDateStr);
  const weekTimeMs = weekSessions.reduce((sum, s) => sum + s.totalTime, 0);
  const weekTimeDisplay = weekTimeMs > 0 ? formatTimeShort(weekTimeMs) : '0m';
  const streak = computeStreak(allSessions);

  const handleShare = async () => {
    console.log('[InsightsScreen] Share button pressed');
    try {
      const topActivitiesRows = stats && stats.perStopwatch.length > 0
        ? stats.perStopwatch.slice(0, 5).map(sw => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${sw.color};margin-right:8px;"></span>
              ${sw.name}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;text-align:right;font-family:monospace;">${formatTimeShort(sw.totalTime)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2a2a2e;text-align:right;color:#888;">${sw.sessions} session${sw.sessions !== 1 ? 's' : ''}</td>
          </tr>`).join('')
        : '<tr><td colspan="3" style="padding:12px;color:#888;text-align:center;">No activity data</td></tr>';

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { background:#0d0f14; color:#f0f0f2; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; margin:0; padding:24px; }
  h1 { font-size:28px; font-weight:800; letter-spacing:-0.5px; margin:0 0 4px; color:#fff; }
  .subtitle { font-size:13px; color:#888; margin-bottom:28px; }
  .section-label { font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:2px; margin:24px 0 10px; }
  .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px; }
  .stat-card { background:#1a1a1e; border-radius:12px; border:1px solid #2a2a2e; padding:14px; }
  .stat-label { font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; }
  .stat-value { font-size:22px; font-weight:800; color:#00d4ff; font-family:monospace; }
  .stat-sub { font-size:12px; color:#888; margin-top:4px; }
  .accent-green { color:#22c55e; }
  .accent-orange { color:#fb923c; }
  .accent-purple { color:#a78bfa; }
  table { width:100%; border-collapse:collapse; background:#1a1a1e; border-radius:12px; overflow:hidden; border:1px solid #2a2a2e; }
  th { padding:10px 12px; text-align:left; font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:1.5px; border-bottom:1px solid #2a2a2e; }
  td { font-size:14px; color:#f0f0f2; }
  .footer { margin-top:32px; font-size:11px; color:#555; text-align:center; }
</style>
</head>
<body>
<h1>Chroniqo Stats</h1>
<div class="subtitle">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

<div class="section-label">This Week</div>
<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-label">Focused</div>
    <div class="stat-value">${weekTimeDisplay}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Sessions</div>
    <div class="stat-value">${weekSessions.length}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Streak</div>
    <div class="stat-value accent-orange">${streak}d</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Completion</div>
    <div class="stat-value accent-green">${completionRate}</div>
  </div>
</div>

<div class="section-label">All Time</div>
<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-label">Total Time</div>
    <div class="stat-value">${totalTimeDisplay}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Total Sessions</div>
    <div class="stat-value">${stats ? stats.totalSessions : 0}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Total Laps</div>
    <div class="stat-value">${stats ? stats.totalLaps : 0}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Goals Achieved</div>
    <div class="stat-value accent-green">${achievedGoals}</div>
  </div>
</div>

<div class="section-label">By Activity</div>
<table>
  <thead>
    <tr>
      <th>Activity</th>
      <th style="text-align:right;">Time</th>
      <th style="text-align:right;">Sessions</th>
    </tr>
  </thead>
  <tbody>
    ${topActivitiesRows}
  </tbody>
</table>

<div class="footer">Chroniqo · Time Tracking</div>
</body>
</html>`;

      console.log('[InsightsScreen] Generating PDF from stats HTML');
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      console.log(`[InsightsScreen] PDF generated: ${uri}`);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Chroniqo Stats' });
        console.log('[InsightsScreen] PDF shared successfully');
      } else {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
      }
    } catch (e) {
      console.warn('[InsightsScreen] Share failed:', e);
      Alert.alert('Share Failed', 'Could not generate the stats PDF. Please try again.');
    }
  };

  const sectionLabel = {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 2.0,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 28,
  };

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.background }} />;
  }

  const last7Days = getLast7Days();
  const sessionsByDay: Record<string, number> = {};
  const timeByDay: Record<string, number> = {};
  for (const s of sessions) {
    const dateKey = s.startedAt.slice(0, 10);
    sessionsByDay[dateKey] = (sessionsByDay[dateKey] ?? 0) + 1;
    timeByDay[dateKey] = (timeByDay[dateKey] ?? 0) + s.totalTime;
  }

  const sessionChartData = last7Days.map(d => ({
    label: d.label,
    value: sessionsByDay[d.dateKey] ?? 0,
  }));

  const timeChartData = last7Days.map(d => {
    const ms = timeByDay[d.dateKey] ?? 0;
    return { label: d.label, value: ms, subLabel: ms > 0 ? formatTimeShort(ms) : '' };
  });

  const hasChartData = sessionChartData.some(d => d.value > 0);
  const mostActiveDay = sessions.length > 0 ? getMostActiveDayOfWeek(sessions) : '—';
  const avgSessionMs = sessions.length > 0 && stats ? stats.totalTime / sessions.length : 0;
  const avgSessionDisplay = avgSessionMs > 0 ? formatAvgSession(avgSessionMs) : '—';
  const longestSessionMs = getLongestSession(sessions);
  const longestSessionDisplay = longestSessionMs > 0 ? formatTime(longestSessionMs) : '—';

  const MAX_HISTORY = 20;
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  const visibleSessions = historyExpanded ? sortedSessions : sortedSessions.slice(0, MAX_HISTORY);
  const hiddenCount = sortedSessions.length - MAX_HISTORY;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <AmbientBackground />
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
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
          Insights
        </Text>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
            borderWidth: 1,
            borderColor: C.border,
          })}
        >
          <Share2 size={18} color={C.textSecondary} />
        </Pressable>
      </View>

      {/* Filter Bar */}
      {filterChips.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' }}
          style={{ flexGrow: 0 }}
        >
          {filterChips.map(chip => {
            const isSelected = activeFilter === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => {
                  console.log(`[InsightsScreen] Filter chip pressed: ${chip}`);
                  setActiveFilter(chip);
                }}
                style={{
                  backgroundColor: isSelected ? C.primary : C.surfaceSecondary,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  alignSelf: 'center',
                  borderWidth: isSelected ? 0 : 1,
                  borderColor: C.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isSelected ? '#0D0F14' : C.chipText,
                  }}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}
      >
        {/* Weekly Review — always shown */}
        <WeeklyReviewCard
          sessions={allSessions}
          completions={completions}
          routines={routines}
        />

        {allSessions.length === 0 ? (
          <>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 40 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  // @ts-expect-error borderCurve
                  borderCurve: 'continuous',
                  backgroundColor: C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}
              >
                <BarChart2 size={36} color={C.textSecondary} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'center' }}>
                No data yet
              </Text>
              <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                Complete some sessions to see stats.
              </Text>
            </View>
            <GoalsSection
              goals={goals}
              sectionLabel={sectionLabel}
              activeGoals={activeGoals}
              achievedGoals={achievedGoals}
              missedGoals={missedGoals}
              completionRate={completionRate}
            />
          </>
        ) : (
          <>
            {/* Sessions bar chart */}
            {hasChartData && (
              <>
                <Text style={sectionLabel}>Sessions — Last 7 Days</Text>
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    // @ts-expect-error borderCurve
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 16,
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <BarChart data={sessionChartData} barColor={C.primary} maxBarHeight={80} />
                </View>
              </>
            )}

            {/* Time tracked bar chart */}
            {hasChartData && (
              <>
                <Text style={sectionLabel}>Time Tracked — Last 7 Days</Text>
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    // @ts-expect-error borderCurve
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: 16,
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <BarChart data={timeChartData} barColor="#34C759" maxBarHeight={80} formatValue={formatTimeShort} />
                </View>
              </>
            )}

            {/* Overview stats 2×2 */}
            <Text style={sectionLabel}>Overview</Text>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 }}>
              <StatCard
                label="Total Time"
                value={totalTimeDisplay}
                iconNode={<Timer size={15} color="#34C759" />}
                iconBgColor="rgba(52,199,89,0.15)"
              />
              <StatCard
                label="Sessions"
                value={String(stats!.totalSessions)}
                iconNode={<BarChart2 size={15} color={C.primary} />}
                iconBgColor={C.primaryMuted}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 }}>
              <StatCard
                label="Total Laps"
                value={String(stats!.totalLaps)}
                iconNode={<Flag size={15} color="#FF9500" />}
                iconBgColor="rgba(255,149,0,0.15)"
              />
              {stats!.mostUsedCategory ? (
                <StatCard
                  label="Top Category"
                  value={stats!.mostUsedCategory}
                  iconNode={<Tag size={15} color="#BF5AF2" />}
                  iconBgColor="rgba(191,90,242,0.15)"
                />
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>

            {/* Performance stats row */}
            <Text style={sectionLabel}>Performance</Text>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
              <MiniStatChip label="Avg Session" value={avgSessionDisplay} />
              <MiniStatChip label="Longest" value={longestSessionDisplay} />
              <MiniStatChip label="Most Active" value={mostActiveDay} />
            </View>

            {/* Lap Records */}
            {stats!.totalLaps > 0 && (
              <>
                <Text style={sectionLabel}>Lap Records</Text>
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
                  <StatCard
                    label="Fastest"
                    value={stats!.fastestLap ? formatTime(stats!.fastestLap.lapTime) : '—'}
                    accent="#34C759"
                    iconNode={<Zap size={15} color="#34C759" />}
                    iconBgColor="rgba(52,199,89,0.15)"
                  />
                  <StatCard
                    label="Slowest"
                    value={stats!.slowestLap ? formatTime(stats!.slowestLap.lapTime) : '—'}
                    accent="#FF453A"
                    iconNode={<TrendingDown size={15} color="#FF453A" />}
                    iconBgColor="rgba(255,69,58,0.15)"
                  />
                  <StatCard
                    label="Average"
                    value={stats!.avgLapTime > 0 ? formatTime(Math.round(stats!.avgLapTime)) : '—'}
                    iconNode={<TrendingUp size={15} color={C.textSecondary} />}
                    iconBgColor={C.surfaceSecondary}
                  />
                </View>
              </>
            )}

            {/* Activity Breakdown */}
            {stats!.perStopwatch.length > 0 && (
              <>
                <Text style={sectionLabel}>By Activity</Text>
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    // @ts-expect-error borderCurve
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    overflow: 'hidden',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {stats!.perStopwatch.map((sw, idx) => (
                    <View key={sw.id} style={idx === stats!.perStopwatch.length - 1 ? { borderBottomWidth: 0 } : {}}>
                      <SwStatRow
                        name={sw.name}
                        color={sw.color}
                        sessionCount={sw.sessions}
                        totalTime={sw.totalTime}
                        totalTimeAll={stats!.totalTime}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Session History */}
            {sessions.length > 0 && (
              <>
                <Text style={sectionLabel}>Session History</Text>
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: C.surface,
                    borderRadius: 14,
                    // @ts-expect-error borderCurve
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: C.border,
                    overflow: 'hidden',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {visibleSessions.map((session, idx) => (
                    <View
                      key={session.id}
                      style={idx === visibleSessions.length - 1 && (historyExpanded || hiddenCount <= 0) ? { borderBottomWidth: 0 } : {}}
                    >
                      <SessionHistoryRow session={session} />
                    </View>
                  ))}
                  {!historyExpanded && hiddenCount > 0 && (
                    <Pressable
                      onPress={() => {
                        console.log(`[InsightsScreen] Show more sessions pressed (${hiddenCount} more)`);
                        setHistoryExpanded(true);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 13,
                        gap: 6,
                        opacity: pressed ? 0.6 : 1,
                        borderTopWidth: 1,
                        borderTopColor: C.divider,
                      })}
                    >
                      <ChevronDown size={14} color={C.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>
                        Show {hiddenCount} more
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {/* Goals */}
            <GoalsSection
              goals={goals}
              sectionLabel={sectionLabel}
              activeGoals={activeGoals}
              achievedGoals={achievedGoals}
              missedGoals={missedGoals}
              completionRate={completionRate}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
