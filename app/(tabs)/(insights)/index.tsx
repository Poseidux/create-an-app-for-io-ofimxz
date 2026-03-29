import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
  Platform,
  Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  Trash2,
  BarChart2,
  Flag,
  Zap,
  TrendingDown,
  TrendingUp,
  Timer,
  Share2,
  Tag,
} from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, Lap, formatTime } from '@/types/stopwatch';
import { getSessions, deleteSession } from '@/utils/session-storage';
import { getGoals, ItemGoal } from '@/utils/goal-storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' · ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

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

function getDateKey(iso: string): string {
  return iso.slice(0, 10);
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

  return {
    totalTime,
    totalSessions: sessions.length,
    totalLaps,
    fastestLap,
    slowestLap,
    avgLapTime,
    mostUsedCategory,
    perStopwatch,
  };
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────

interface FilterChipsProps {
  tags: string[];
  selected: string;
  onSelect: (tag: string) => void;
}

function FilterChips({ tags, selected, onSelect }: FilterChipsProps) {
  const C = useColors();
  const allTags = ['All', ...tags];

  return (
    <View style={{ height: 44, overflow: 'hidden' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 8,
          height: 44,
        }}
      >
        {allTags.map(tag => {
          const isSelected = selected === tag;
          return (
            <Pressable
              key={tag}
              onPress={() => {
                console.log(`[InsightsScreen] Filter chip pressed: ${tag}`);
                onSelect(tag);
              }}
              style={({ pressed }) => ({
                flexShrink: 0,
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
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: Session;
  onPress: () => void;
  onDelete: () => void;
}

function SessionRow({ session, onPress, onDelete }: SessionRowProps) {
  const C = useColors();
  const swColor = session.color || '#22c55e';
  const lapCount = (session.laps ?? []).length;
  const lapLabel = lapCount > 0 ? `${lapCount} lap${lapCount !== 1 ? 's' : ''}` : null;
  const totalTimeDisplay = formatTime(session.totalTime);
  const dateDisplay = formatDate(session.startedAt);

  const handleDelete = () => {
    console.log(`[InsightsScreen] Delete session pressed: id=${session.id}`);
    Alert.alert(
      'Delete Session?',
      'This session will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[InsightsScreen] Delete session confirmed: id=${session.id}`);
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={() => {
        console.log(`[InsightsScreen] Session row pressed: id=${session.id}`);
        onPress();
      }}
      onLongPress={handleDelete}
      delayLongPress={500}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginBottom: 10,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 14,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: C.border,
          borderLeftWidth: 4,
          borderLeftColor: swColor,
          padding: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 3 }}>
              {session.stopwatchName}
            </Text>
            {session.category ? (
              <Text style={{ fontSize: 12, color: C.subtext, marginBottom: 6 }}>
                {session.category}
              </Text>
            ) : null}
            <Text style={{ fontSize: 12, color: C.textSecondary }}>
              {dateDisplay}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                color: C.text,
                fontVariant: ['tabular-nums'],
                letterSpacing: -0.5,
              }}
            >
              {totalTimeDisplay}
            </Text>
            {lapLabel !== null && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 20,
                  backgroundColor: C.surfaceSecondary,
                }}
              >
                <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '500' }}>
                  {lapLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
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
        backgroundColor: C.card,
        borderRadius: 14,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        flex: 1,
        gap: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
        <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: accent ?? C.text,
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
        backgroundColor: C.card,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '600', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
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

// ─── Per-Stopwatch Row ────────────────────────────────────────────────────────

interface SwStatRowProps {
  name: string;
  color: string;
  sessionCount: number;
  totalTime: number;
}

function SwStatRow({ name, color, sessionCount, totalTime }: SwStatRowProps) {
  const C = useColors();
  const totalTimeDisplay = formatTime(totalTime);
  const sessionLabel = `${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
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
          backgroundColor: color,
          marginRight: 10,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: C.subtext }}>
          {sessionLabel}
        </Text>
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
            {/* Bar with subtle highlight layer */}
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

// ─── Goal Row ─────────────────────────────────────────────────────────────────

function goalTypeLabel(type: ItemGoal['goalType']): string {
  switch (type) {
    case 'target_duration': return 'Target Duration';
    case 'target_laps': return 'Target Laps';
    case 'beat_personal_best': return 'Beat PB';
    case 'complete_countdown': return 'Complete Countdown';
    case 'complete_all_rounds': return 'Complete All Rounds';
    default: return type;
  }
}

interface GoalRowProps {
  goal: ItemGoal;
}

function GoalRow({ goal }: GoalRowProps) {
  const C = useColors();

  const displayName = goal.goalName || goal.itemName || goal.itemId;
  const typeLabel = goalTypeLabel(goal.goalType);

  let detailText = '';
  if (goal.goalType === 'target_duration' && goal.targetMs != null) {
    detailText = formatTime(goal.targetMs);
  } else if (goal.goalType === 'beat_personal_best' && goal.personalBestMs != null) {
    detailText = formatTime(goal.personalBestMs);
  } else if (goal.goalType === 'target_laps' && goal.targetLaps != null) {
    detailText = `${goal.targetLaps} laps`;
  }

  const isAchieved = goal.status === 'achieved';
  const isMissed = goal.status === 'missed';

  const badgeColor = isAchieved ? '#34C759' : isMissed ? C.textSecondary : '#0A84FF';
  const badgeBg = isAchieved ? 'rgba(52,199,89,0.12)' : isMissed ? C.surfaceSecondary : 'rgba(10,132,255,0.12)';
  const badgeText = isAchieved ? '✓ Achieved' : isMissed ? '✗ Missed' : 'Active';

  const progressFill = isAchieved ? 1 : isMissed ? 0.5 : 0;
  const progressColor = isAchieved ? '#34C759' : isMissed ? C.textSecondary : C.primary;

  let dateOrStatus = '';
  if (isAchieved && goal.achievedAt) {
    dateOrStatus = formatShortDate(goal.achievedAt);
  } else if (!isAchieved && !isMissed) {
    dateOrStatus = 'In progress';
  }

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 12, color: C.textSecondary }}>
            {typeLabel}
            {detailText !== '' ? ` · ${detailText}` : ''}
          </Text>
          {dateOrStatus !== '' && (
            <Text style={{ fontSize: 11, color: isAchieved ? '#34C759' : C.subtext, marginTop: 3 }}>
              {dateOrStatus}
            </Text>
          )}
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: badgeBg }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: badgeColor }}>
            {badgeText}
          </Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: C.surfaceSecondary, borderRadius: 2, overflow: 'hidden' }}>
        <View
          style={{
            height: 4,
            width: `${Math.round(progressFill * 100)}%`,
            backgroundColor: progressColor,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

// ─── Goals Section ────────────────────────────────────────────────────────────

function GoalsSection({ goals }: { goals: ItemGoal[] }) {
  const C = useColors();

  // Sort: achieved first, then active, then missed
  const sorted = [...goals].sort((a, b) => {
    const order: Record<string, number> = { achieved: 0, active: 1, missed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const countLabel = String(goals.length);

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 24, marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          Goal History
        </Text>
        {goals.length > 0 && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: C.surfaceSecondary }}>
            <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600' }}>
              {countLabel}
            </Text>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        {sorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              No goals yet — set a goal on any stopwatch or timer.
            </Text>
          </View>
        ) : (
          sorted.map(goal => <GoalRow key={goal.id} goal={goal} />)
        )}
      </View>
    </>
  );
}

// ─── Stats Content ────────────────────────────────────────────────────────────

function StatsContent({
  sessions,
  isLoaded,
  goals,
  listBottomPad,
}: {
  sessions: Session[];
  isLoaded: boolean;
  goals: ItemGoal[];
  listBottomPad: number;
}) {
  const C = useColors();

  const sectionLabel = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.subtext,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 24,
  };

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.background }} />;
  }

  if (sessions.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
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
        <GoalsSection goals={goals} />
      </ScrollView>
    );
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
    return {
      label: d.label,
      value: ms,
      subLabel: ms > 0 ? formatTimeShort(ms) : '',
    };
  });

  const hasChartData = sessionChartData.some(d => d.value > 0);
  const stats = computeStats(sessions);
  const totalTimeDisplay = formatTime(stats.totalTime);
  const fastestDisplay = stats.fastestLap ? formatTime(stats.fastestLap.lapTime) : '—';
  const slowestDisplay = stats.slowestLap ? formatTime(stats.slowestLap.lapTime) : '—';
  const avgDisplay = stats.avgLapTime > 0 ? formatTime(Math.round(stats.avgLapTime)) : '—';

  const mostActiveDay = getMostActiveDayOfWeek(sessions);
  const avgSessionMs = sessions.length > 0 ? stats.totalTime / sessions.length : 0;
  const avgSessionDisplay = avgSessionMs > 0 ? formatAvgSession(avgSessionMs) : '—';
  const longestSessionMs = getLongestSession(sessions);
  const longestSessionDisplay = longestSessionMs > 0 ? formatTime(longestSessionMs) : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
    >
      {/* Overview */}
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
          value={String(stats.totalSessions)}
          iconNode={<BarChart2 size={15} color="#0A84FF" />}
          iconBgColor="rgba(10,132,255,0.15)"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 }}>
        <StatCard
          label="Total Laps"
          value={String(stats.totalLaps)}
          iconNode={<Flag size={15} color="#FF9500" />}
          iconBgColor="rgba(255,149,0,0.15)"
        />
        {stats.mostUsedCategory ? (
          <StatCard
            label="Top Category"
            value={stats.mostUsedCategory}
            iconNode={<Tag size={15} color="#BF5AF2" />}
            iconBgColor="rgba(191,90,242,0.15)"
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>

      {/* Lap stats */}
      {stats.totalLaps > 0 && (
        <>
          <Text style={sectionLabel}>Lap Records</Text>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
            <StatCard
              label="Fastest"
              value={fastestDisplay}
              accent="#34C759"
              iconNode={<Zap size={15} color="#34C759" />}
              iconBgColor="rgba(52,199,89,0.15)"
            />
            <StatCard
              label="Slowest"
              value={slowestDisplay}
              accent="#FF453A"
              iconNode={<TrendingDown size={15} color="#FF453A" />}
              iconBgColor="rgba(255,69,58,0.15)"
            />
            <StatCard
              label="Average"
              value={avgDisplay}
              iconNode={<TrendingUp size={15} color={C.textSecondary} />}
              iconBgColor={C.surfaceSecondary}
            />
          </View>
        </>
      )}

      {/* Sessions Over Time chart */}
      {hasChartData && (
        <>
          <Text style={sectionLabel}>Sessions (Last 7 Days)</Text>
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: C.card,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              padding: 16,
            }}
          >
            <BarChart data={sessionChartData} barColor={C.primary} maxBarHeight={80} />
          </View>
        </>
      )}

      {/* Time Per Day chart */}
      {hasChartData && (
        <>
          <Text style={sectionLabel}>Time Tracked (Last 7 Days)</Text>
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: C.card,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              padding: 16,
            }}
          >
            <BarChart
              data={timeChartData}
              barColor="#34C759"
              maxBarHeight={80}
              formatValue={formatTimeShort}
            />
          </View>
        </>
      )}

      {/* Top Activity summary */}
      {sessions.length > 0 && (
        <>
          <Text style={sectionLabel}>Top Activity</Text>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            <MiniStatChip label="Best Day" value={mostActiveDay} />
            <MiniStatChip label="Avg Session" value={avgSessionDisplay} />
            <MiniStatChip label="Longest" value={longestSessionDisplay} />
          </View>
        </>
      )}

      {/* Per-stopwatch breakdown */}
      {stats.perStopwatch.length > 0 && (
        <>
          <Text style={sectionLabel}>By Stopwatch</Text>
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: C.card,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
            }}
          >
            {stats.perStopwatch.map((sw, idx) => (
              <View
                key={sw.id}
                style={idx === stats.perStopwatch.length - 1 ? { borderBottomWidth: 0 } : {}}
              >
                <SwStatRow
                  name={sw.name}
                  color={sw.color}
                  sessionCount={sw.sessions}
                  totalTime={sw.totalTime}
                />
              </View>
            ))}
          </View>
        </>
      )}

      {/* Goal History */}
      <GoalsSection goals={goals} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTag, setSelectedTag] = useState('All');
  const [goals, setGoals] = useState<ItemGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      console.log('[InsightsScreen] Focus: loading sessions and goals');
      Promise.all([getSessions(), getGoals()]).then(([data, loadedGoals]) => {
        const sorted = [...data].sort((a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setSessions(sorted);
        setIsLoaded(true);
        setGoals(loadedGoals);
        console.log(`[InsightsScreen] Loaded ${sorted.length} session(s), ${loadedGoals.length} goal(s)`);
      });
    }, [])
  );

  const handleDelete = useCallback(async (id: string) => {
    console.log(`[InsightsScreen] Delete session: id=${id}`);
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const uniqueTags = Array.from(
    new Set(sessions.map(s => s.category).filter(Boolean))
  ) as string[];

  const filteredSessions = selectedTag === 'All'
    ? sessions
    : sessions.filter(s => s.category === selectedTag);

  const listBottomPad = insets.bottom + 100;

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
          <View style={{ width: 36 }} />
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: C.text,
            }}
          >
            Insights
          </Text>
          <Pressable
            onPress={() => {
              console.log('[InsightsScreen] Share button pressed');
              const stats = computeStats(sessions);
              const totalTimeDisplay = formatTime(stats.totalTime);
              const achievedCount = goals.filter(g => g.status === 'achieved').length;
              const shareText = `Chroniqo Stats\n• ${stats.totalSessions} sessions\n• ${totalTimeDisplay} tracked\n• ${stats.totalLaps} laps\n• ${achievedCount}/${goals.length} goals achieved`;
              Share.share({ message: shareText });
            }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Share2 size={20} color={C.primary} />
          </Pressable>
        </View>

        {/* Segmented control */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.surfaceSecondary,
              borderRadius: 10,
              padding: 2,
            }}
          >
            <Pressable
              onPress={() => {
                console.log('[InsightsScreen] Segment pressed: history');
                setActiveTab('history');
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: activeTab === 'history' ? C.primary : 'transparent',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: activeTab === 'history' ? '#fff' : C.textSecondary,
                }}
              >
                History
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                console.log('[InsightsScreen] Segment pressed: stats');
                setActiveTab('stats');
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: activeTab === 'stats' ? C.primary : 'transparent',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: activeTab === 'stats' ? '#fff' : C.textSecondary,
                }}
              >
                Stats
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: C.separator }} />
      </View>

      {/* History tab */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {uniqueTags.length > 0 && (
            <FilterChips
              tags={uniqueTags}
              selected={selectedTag}
              onSelect={setSelectedTag}
            />
          )}
          {isLoaded && sessions.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  borderCurve: 'continuous',
                  backgroundColor: C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}
              >
                <Clock size={36} color={C.textSecondary} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'center' }}>
                No sessions yet
              </Text>
              <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                Stop a stopwatch to save a session.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSessions}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
              renderItem={({ item }) => (
                <SessionRow
                  session={item}
                  onPress={() => {
                    console.log(`[InsightsScreen] Navigate to session detail: id=${item.id}`);
                    router.push(`/(tabs)/(history)/${item.id}`);
                  }}
                  onDelete={() => handleDelete(item.id)}
                />
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Text style={{ fontSize: 15, color: C.textSecondary }}>
                    No sessions in this category.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <StatsContent
          sessions={sessions}
          isLoaded={isLoaded}
          goals={goals}
          listBottomPad={listBottomPad}
        />
      )}
    </View>
  );
}
