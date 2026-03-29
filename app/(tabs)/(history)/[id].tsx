import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  Share,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, Clock, Zap, TrendingDown, TrendingUp, Share2 } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, Lap, formatTime } from '@/types/stopwatch';
import { getSession } from '@/utils/session-storage';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
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
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: accent ?? C.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Lap Row ──────────────────────────────────────────────────────────────────

interface LapRowProps {
  lap: Lap;
  isFastest: boolean;
  isSlowest: boolean;
}

function LapRow({ lap, isFastest, isSlowest }: LapRowProps) {
  const C = useColors();
  const lapTimeDisplay = formatTime(lap.lapTime);
  const splitTimeDisplay = formatTime(lap.splitTime);

  const rowBg = isFastest
    ? 'rgba(52,199,89,0.08)'
    : isSlowest
    ? 'rgba(255,59,48,0.08)'
    : 'transparent';

  const lapTimeColor = isFastest ? '#34C759' : isSlowest ? '#FF3B30' : C.text;

  return (
    <View
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
          {String(lap.lapNumber)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            color: lapTimeColor,
            fontVariant: ['tabular-nums'],
          }}
        >
          {lapTimeDisplay}
        </Text>
        {lap.note ? (
          <Text style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
            {lap.note}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 13,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: C.textSecondary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {splitTimeDisplay}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const C = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    console.log(`[SessionDetail] Loading session id=${id}`);
    getSession(id).then(s => {
      setSession(s);
      setIsLoaded(true);
      console.log(`[SessionDetail] Session loaded: ${s ? s.stopwatchName : 'not found'}`);
    });
  }, [id]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.background }} />;
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textSecondary, fontSize: 15 }}>Session not found.</Text>
      </View>
    );
  }

  const laps = session.laps ?? [];
  const swColor = session.color || '#22c55e';
  const totalTimeDisplay = formatTime(session.totalTime);
  const startedDisplay = formatDate(session.startedAt);
  const endedDisplay = formatDate(session.endedAt);
  const dateShort = formatDateShort(session.startedAt);

  // Lap stats
  let fastestLap: Lap | null = null;
  let slowestLap: Lap | null = null;
  let avgLapTime = 0;

  if (laps.length >= 1) {
    fastestLap = laps.reduce((a, b) => a.lapTime < b.lapTime ? a : b);
    slowestLap = laps.reduce((a, b) => a.lapTime > b.lapTime ? a : b);
    avgLapTime = laps.reduce((sum, l) => sum + l.lapTime, 0) / laps.length;
  }

  const fastestId = fastestLap?.id;
  const slowestId = laps.length >= 2 ? slowestLap?.id : undefined;

  const handleShare = async () => {
    console.log(`[SessionDetail] Share pressed: id=${session.id}`);
    const lapCount = laps.length;
    const fastestDisplay = fastestLap ? formatTime(fastestLap.lapTime) : null;
    const avgDisplay = avgLapTime > 0 ? formatTime(Math.round(avgLapTime)) : null;

    let message = `📊 Chroniqo Session Summary\n\n`;
    message += `🏷️ ${session.stopwatchName}\n`;
    if (session.category) message += `📁 ${session.category}\n`;
    message += `⏱️ Total Time: ${totalTimeDisplay}\n`;
    message += `📅 ${dateShort}\n`;
    message += `🏁 Laps: ${lapCount}\n`;
    if (fastestDisplay) message += `⚡ Fastest Lap: ${fastestDisplay}\n`;
    if (avgDisplay) message += `📈 Avg Lap: ${avgDisplay}\n`;
    message += `\nTracked with Chroniqo`;

    try {
      await Share.share({ message });
      console.log(`[SessionDetail] Share completed: id=${session.id}`);
    } catch (e) {
      console.log(`[SessionDetail] Share cancelled or failed: ${e}`);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      {/* Share button row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: C.surfaceSecondary,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Share2 size={15} color={C.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary }}>Share</Text>
        </Pressable>
      </View>

      {/* Header card */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: C.card,
          borderRadius: 16,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: C.border,
          borderLeftWidth: 4,
          borderLeftColor: swColor,
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 }}>
          {session.stopwatchName}
        </Text>
        {session.category ? (
          <Text style={{ fontSize: 13, color: C.subtext, marginBottom: 10 }}>
            {session.category}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            color: swColor,
            fontVariant: ['tabular-nums'],
            letterSpacing: -1,
            marginBottom: 12,
          }}
        >
          {totalTimeDisplay}
        </Text>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color={C.textSecondary} />
            <Text style={{ fontSize: 12, color: C.textSecondary }}>
              {'Started: '}
              {startedDisplay}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color={C.textSecondary} />
            <Text style={{ fontSize: 12, color: C.textSecondary }}>
              {'Ended: '}
              {endedDisplay}
            </Text>
          </View>
        </View>
        {session.note ? (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              backgroundColor: C.surfaceSecondary,
              borderRadius: 8,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }}>
              {session.note}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Lap stats */}
      {laps.length >= 1 && (
        <>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.subtext,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              paddingHorizontal: 16,
              marginBottom: 10,
            }}
          >
            Lap Stats
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 20 }}>
            <StatCard label="Fastest" value={formatTime(fastestLap!.lapTime)} accent="#34C759" />
            {laps.length >= 2 && (
              <StatCard label="Slowest" value={formatTime(slowestLap!.lapTime)} accent="#FF3B30" />
            )}
            <StatCard label="Average" value={formatTime(Math.round(avgLapTime))} />
          </View>
        </>
      )}

      {/* Lap list */}
      {laps.length > 0 && (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              marginBottom: 8,
              gap: 6,
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
              marginHorizontal: 16,
              backgroundColor: C.card,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              padding: 8,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 6 }}>
              <View style={{ width: 36 }}>
                <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>
                  #
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>
                  Lap Time
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>
                Split
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 4 }} />
            {laps.map(lap => (
              <LapRow
                key={lap.id}
                lap={lap}
                isFastest={lap.id === fastestId}
                isSlowest={laps.length >= 2 && lap.id === slowestId}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
