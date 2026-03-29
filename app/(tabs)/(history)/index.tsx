import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Trash2, Share2 } from 'lucide-react-native';
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
                console.log(`[HistoryScreen] Filter chip pressed: ${tag}`);
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
  const [selectedTag, setSelectedTag] = useState('All');

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

  // Unique tags from sessions
  const uniqueTags = Array.from(
    new Set(sessions.map(s => s.category).filter(Boolean))
  ) as string[];

  const filteredSessions = selectedTag === 'All'
    ? sessions
    : sessions.filter(s => s.category === selectedTag);

  const handleShare = async () => {
    console.log('[HistoryScreen] Share button pressed');
    const lines = filteredSessions.slice(0, 10).map(s =>
      `${s.stopwatchName} — ${formatTime(s.totalTime)}`
    );
    const summary = `Chroniqo History\n\n${lines.join('\n')}`;
    console.log(`[HistoryScreen] Sharing ${lines.length} session(s)`);
    await Share.share({ message: summary });
  };

  const showEmpty = isLoaded && sessions.length === 0;
  const listBottomPad = insets.bottom + 100;

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
          <View style={{ flex: 1 }} />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: C.text, textAlign: 'center' }}>
            History
          </Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: C.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Share2 size={18} color={C.textSecondary} />
            </Pressable>
          </View>
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
              onPress={() => router.push(`/(tabs)/(history)/${item.id}`)}
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
  );
}
