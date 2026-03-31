import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  Platform,
  Share,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Flag, Zap, TrendingDown, TrendingUp, Share2, X } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, Lap, formatTime } from '@/types/stopwatch';
import { getSessions, deleteSession, getSession } from '@/utils/session-storage';

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

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
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
                console.log(`[SessionsScreen] Filter chip pressed: ${tag}`);
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
    console.log(`[SessionsScreen] Delete session pressed: id=${session.id}`);
    Alert.alert(
      'Delete Session?',
      'This session will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[SessionsScreen] Delete session confirmed: id=${session.id}`);
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={() => {
        console.log(`[SessionsScreen] Session row pressed: id=${session.id}`);
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

// ─── Stat Card (detail modal) ─────────────────────────────────────────────────

function DetailStatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
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

// ─── Lap Row (detail modal) ───────────────────────────────────────────────────

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

// ─── Session Detail Modal ─────────────────────────────────────────────────────

interface SessionDetailModalProps {
  sessionId: string | null;
  onClose: () => void;
}

function SessionDetailModal({ sessionId, onClose }: SessionDetailModalProps) {
  const C = useColors();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setIsLoaded(false);
      return;
    }
    console.log(`[SessionsScreen] Loading session detail: id=${sessionId}`);
    getSession(sessionId).then(s => {
      setSession(s);
      setIsLoaded(true);
      console.log(`[SessionsScreen] Session detail loaded: ${s ? s.stopwatchName : 'not found'}`);
    });
  }, [sessionId]);

  const handleShare = async () => {
    if (!session) return;
    console.log(`[SessionsScreen] Share session pressed: id=${session.id}`);
    const laps = session.laps ?? [];
    const totalTimeDisplay = formatTime(session.totalTime);
    const dateShort = formatDateShort(session.startedAt);
    let fastestLap: Lap | null = null;
    let avgLapTime = 0;
    if (laps.length >= 1) {
      fastestLap = laps.reduce((a, b) => a.lapTime < b.lapTime ? a : b);
      avgLapTime = laps.reduce((sum, l) => sum + l.lapTime, 0) / laps.length;
    }
    const fastestDisplay = fastestLap ? formatTime(fastestLap.lapTime) : null;
    const avgDisplay = avgLapTime > 0 ? formatTime(Math.round(avgLapTime)) : null;

    let message = `📊 Chroniqo Session Summary\n\n`;
    message += `🏷️ ${session.stopwatchName}\n`;
    if (session.category) message += `📁 ${session.category}\n`;
    message += `⏱️ Total Time: ${totalTimeDisplay}\n`;
    message += `📅 ${dateShort}\n`;
    message += `🏁 Laps: ${laps.length}\n`;
    if (fastestDisplay) message += `⚡ Fastest Lap: ${fastestDisplay}\n`;
    if (avgDisplay) message += `📈 Avg Lap: ${avgDisplay}\n`;
    message += `\nTracked with Chroniqo`;

    try {
      await Share.share({ message });
    } catch (e) {
      console.log(`[SessionsScreen] Share cancelled: ${e}`);
    }
  };

  const visible = sessionId !== null;

  const renderContent = () => {
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

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
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
              <DetailStatCard label="Fastest" value={formatTime(fastestLap!.lapTime)} accent="#34C759" />
              {laps.length >= 2 && (
                <DetailStatCard label="Slowest" value={formatTime(slowestLap!.lapTime)} accent="#FF3B30" />
              )}
              <DetailStatCard label="Average" value={formatTime(Math.round(avgLapTime))} />
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
                  <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>#</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>Lap Time</Text>
                </View>
                <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>Split</Text>
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: C.background }}>
        {/* Modal header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>
            Session Detail
          </Text>
          <Pressable
            onPress={() => {
              console.log('[SessionsScreen] Session detail modal closed');
              onClose();
            }}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={16} color={C.textSecondary} />
          </Pressable>
        </View>
        {renderContent()}
      </View>
    </Modal>
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
        <Clock size={36} color={C.textSecondary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 8, textAlign: 'center' }}>
        No sessions yet
      </Text>
      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
        Stop a stopwatch to save a session.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      console.log('[SessionsScreen] Focus: loading sessions');
      getSessions().then(data => {
        const sorted = [...data].sort((a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setSessions(sorted);
        setIsLoaded(true);
        console.log(`[SessionsScreen] Loaded ${sorted.length} session(s)`);
      });
    }, [])
  );

  const handleDelete = useCallback(async (id: string) => {
    console.log(`[SessionsScreen] Delete session: id=${id}`);
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
  const showEmpty = isLoaded && sessions.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: C.background,
          borderBottomWidth: 1,
          borderBottomColor: C.separator,
        }}
      >
        <View style={{ height: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
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
            Sessions
          </Text>
          <View style={{ width: 36 }} />
        </View>
        {uniqueTags.length > 0 && (
          <FilterChips
            tags={uniqueTags}
            selected={selectedTag}
            onSelect={setSelectedTag}
          />
        )}
      </View>

      {showEmpty ? (
        <EmptyState />
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
          renderItem={({ item }) => (
            <SessionRow
              session={item}
              onPress={() => {
                console.log(`[SessionsScreen] Open session detail: id=${item.id}`);
                setSelectedSessionId(item.id);
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

      <SessionDetailModal
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </View>
  );
}
