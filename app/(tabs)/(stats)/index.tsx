import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, Clock, Flag, Zap, TrendingDown, TrendingUp, Timer } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, Lap, formatTime } from '@/types/stopwatch';
import { getSessions } from '@/utils/session-storage';

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

  useFocusEffect(
    useCallback(() => {
      console.log('[StatsScreen] Loading sessions for stats');
      getSessions().then(data => {
        setSessions(data);
        setIsLoaded(true);
        console.log(`[StatsScreen] Loaded ${data.length} session(s) for stats`);
      });
    }, [])
  );

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.background }} />;
  }

  if (sessions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <EmptyState />
      </View>
    );
  }

  const stats = computeStats(sessions);
  const totalTimeDisplay = formatTime(stats.totalTime);
  const fastestDisplay = stats.fastestLap ? formatTime(stats.fastestLap.lapTime) : '—';
  const slowestDisplay = stats.slowestLap ? formatTime(stats.slowestLap.lapTime) : '—';
  const avgDisplay = stats.avgLapTime > 0 ? formatTime(Math.round(stats.avgLapTime)) : '—';

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
    </ScrollView>
  );
}
