import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Trash2 } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { Session, formatTime } from '@/types/stopwatch';
import { getSessions, deleteSession } from '@/utils/session-storage';

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
    console.log(`[HistoryScreen] Delete session pressed: id=${session.id}`);
    Alert.alert(
      'Delete Session?',
      'This session will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[HistoryScreen] Delete session confirmed: id=${session.id}`);
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={() => {
        console.log(`[HistoryScreen] Session row pressed: id=${session.id}`);
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
                fontFamily: 'Menlo',
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

export default function HistoryScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadSessions = useCallback(async () => {
    console.log('[HistoryScreen] Loading sessions');
    const data = await getSessions();
    const sorted = [...data].sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    setSessions(sorted);
    setIsLoaded(true);
    console.log(`[HistoryScreen] Loaded ${sorted.length} session(s)`);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const showEmpty = isLoaded && sessions.length === 0;
  const listBottomPad = insets.bottom + 100;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {showEmpty ? (
        <EmptyState />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: listBottomPad }}
          renderItem={({ item }) => (
            <SessionRow
              session={item}
              onPress={() => router.push(`/(tabs)/(history)/${item.id}`)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
