import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, Clock, Flag, Zap, TrendingDown, TrendingUp, Timer, Target } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, Lap, formatTime } from '@/types/stopwatch';
import { getSessions } from '@/utils/session-storage';
import { getGoals, ItemGoal } from '@/utils/goal-storage';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
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
}

function BarChart({ data, maxBarHeight = 80, barColor }: BarChartProps) {
  const C = useColors();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: maxBarHeight + 48 }}>
      {data.map((item, idx) => {
        const barH = item.value > 0 ? Math.max(4, Math.round((item.value / maxValue) * maxBarHeight)) : 0;
        const countLabel = item.value > 0 ? String(item.value) : '';
        return (
          <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            {countLabel !== '' && (
              <Text style={{ fontSize: 10, fontWeight: '600', color: barColor, marginBottom: 3 }}>
                {countLabel}
              </Text>
            )}
            <View
              style={{
                width: '100%',
                height: barH > 0 ? barH : 2,
                backgroundColor: barH > 0 ? barColor : C.divider,
                borderRadius: 4,
                opacity: barH > 0 ? 0.85 : 0.3,
              }}
            />
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
      }}
    >
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
          {goal.itemName}
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
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          backgroundColor: statusBg,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor }}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  const C = useColors();
  return (
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
        <BarChart2 size={36} color={C.textSecondary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'center' }}>
        No data yet
      </Text>
      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
        Complete some sessions to see stats.
      </Text>
    </View>
  );
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
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSec}s`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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

export default function StatsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [goals, setGoals] = useState<ItemGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      console.log('[StatsScreen] Loading sessions and goals for stats');
      Promise.all([getSessions(), getGoals()]).then(([sessionData, goalData]) => {
        setSessions(sessionData);
        setGoals(goalData);
        setIsLoaded(true);
        console.log(`[StatsScreen] Loaded ${sessionData.length} session(s) and ${goalData.length} goal(s)`);
      });
    }, [])
  );

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.background }} />;
  }

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

  // Build chart data for last 7 days
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

  // Goal summary counts
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const achievedGoals = goals.filter(g => g.status === 'achieved').length;
  const missedGoals = goals.filter(g => g.status === 'missed').length;
  const totalGoalsChecked = achievedGoals + missedGoals;
  const completionRateNum = totalGoalsChecked > 0 ? Math.round((achievedGoals / totalGoalsChecked) * 100) : 0;
  const completionRate = totalGoalsChecked > 0 ? `${completionRateNum}%` : '—';

  if (sessions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }}
        >
          <EmptyState />
          <GoalsSection goals={goals} sectionLabel={sectionLabel} activeGoals={activeGoals} achievedGoals={achievedGoals} missedGoals={missedGoals} completionRate={completionRate} />
        </ScrollView>
      </View>
    );
  }

  const stats = computeStats(sessions);
  const totalTimeDisplay = formatTime(stats.totalTime);
  const fastestDisplay = stats.fastestLap ? formatTime(stats.fastestLap.lapTime) : '—';
  const slowestDisplay = stats.slowestLap ? formatTime(stats.slowestLap.lapTime) : '—';
  const avgDisplay = stats.avgLapTime > 0 ? formatTime(Math.round(stats.avgLapTime)) : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }}
    >
      {/* Overview */}
      <Text style={sectionLabel}>Overview</Text>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 }}>
        <StatCard
          label="Total Time"
          value={totalTimeDisplay}
          icon={<Clock size={13} color={C.textSecondary} />}
        />
        <StatCard
          label="Sessions"
          value={String(stats.totalSessions)}
          icon={<Timer size={13} color={C.textSecondary} />}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 }}>
        <StatCard
          label="Total Laps"
          value={String(stats.totalLaps)}
          icon={<Flag size={13} color={C.textSecondary} />}
        />
        {stats.mostUsedCategory ? (
          <StatCard
            label="Top Category"
            value={stats.mostUsedCategory}
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
              icon={<Zap size={13} color="#34C759" />}
            />
            <StatCard
              label="Slowest"
              value={slowestDisplay}
              accent="#FF3B30"
              icon={<TrendingDown size={13} color="#FF3B30" />}
            />
            <StatCard
              label="Average"
              value={avgDisplay}
              icon={<TrendingUp size={13} color={C.textSecondary} />}
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
            <BarChart data={timeChartData} barColor="#34C759" maxBarHeight={80} />
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

      {/* Goals */}
      <GoalsSection
        goals={goals}
        sectionLabel={sectionLabel}
        activeGoals={activeGoals}
        achievedGoals={achievedGoals}
        missedGoals={missedGoals}
        completionRate={completionRate}
      />
    </ScrollView>
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
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          Goals
        </Text>
        <Target size={14} color={C.textSecondary} />
      </View>

      {/* Summary grid */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 }}>
        <StatCard
          label="Active"
          value={String(activeGoals)}
          accent={C.primary}
        />
        <StatCard
          label="Achieved"
          value={String(achievedGoals)}
          accent="#34C759"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 }}>
        <StatCard
          label="Missed"
          value={String(missedGoals)}
          accent="#FF6B6B"
        />
        <StatCard
          label="Completion"
          value={completionRate}
        />
      </View>

      {/* Goal list */}
      {goals.length > 0 ? (
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
          {goals.map((goal, idx) => (
            <View
              key={goal.id}
              style={idx === goals.length - 1 ? { borderBottomWidth: 0 } : {}}
            >
              <GoalRow goal={goal} />
            </View>
          ))}
        </View>
      ) : (
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: C.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            padding: 24,
            alignItems: 'center',
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
