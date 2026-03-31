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
import { Session } from '@/types/stopwatch';
import { ItemGoal } from '@/utils/goal-storage';
import { Settings, User, Clock, Target, TrendingUp } from 'lucide-react-native';

const PROFILE_NAME_KEY = '@chroniqo_profile_name';

function formatTotalTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
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

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        console.log('[ProfileScreen] Focus — loading profile data');
        const [storedName, loadedSessions, loadedGoals] = await Promise.all([
          AsyncStorage.getItem(PROFILE_NAME_KEY),
          getSessions(),
          getGoals(),
        ]);
        setName(storedName ?? '');
        setSessions(loadedSessions);
        setGoals(loadedGoals);
        console.log(
          `[ProfileScreen] Loaded: name="${storedName}", sessions=${loadedSessions.length}, goals=${loadedGoals.length}`
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

  // Derived stats
  const totalSessions = sessions.length;
  const totalTimeMs = sessions.reduce((acc, s) => acc + (s.totalTime ?? 0), 0);
  const totalTimeDisplay = formatTotalTime(totalTimeMs);
  const goalsAchieved = goals.filter(g => g.status === 'achieved').length;
  const goalsActive = goals.filter(g => g.status === 'active').length;

  // Top stopwatches by total session time
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

  const hasData = totalSessions > 0 || goals.length > 0 || name.trim().length > 0;

  const trimmedName = name.trim();
  const avatarInitial = trimmedName.length > 0 ? trimmedName[0].toUpperCase() : null;
  const editHintVisible = trimmedName.length === 0;

  const avatarBg = `${C.primary}33`;

  const sectionTitle = (label: string) => (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: C.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 16,
        marginBottom: 10,
        marginTop: 28,
      }}
    >
      {label}
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: C.background,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <View
          style={{
            height: 52,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 28,
              fontWeight: '700',
              color: C.text,
              letterSpacing: -0.5,
            }}
          >
            Profile
          </Text>
          <Pressable
            onPress={handleSettingsPress}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              backgroundColor: pressed ? C.border : 'transparent',
            })}
          >
            <Settings size={22} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card */}
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: avatarBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarInitial ? (
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: C.primary,
                }}
              >
                {avatarInitial}
              </Text>
            ) : (
              <User size={28} color={C.primary} />
            )}
          </View>

          {/* Name + hint */}
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
                fontSize: 20,
                fontWeight: '600',
                color: C.text,
                padding: 0,
                paddingVertical: Platform.OS === 'ios' ? 2 : 0,
              }}
            />
            {editHintVisible && (
              <Text
                style={{
                  fontSize: 12,
                  color: C.textSecondary,
                  marginTop: 4,
                }}
              >
                Tap to edit your name
              </Text>
            )}
          </View>
        </View>

        {/* Empty state */}
        {!hasData && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 24,
              backgroundColor: C.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 28,
              alignItems: 'center',
            }}
          >
            <TrendingUp size={36} color={C.textSecondary} style={{ marginBottom: 12 }} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: C.text,
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              Your profile is empty
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: C.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Start tracking sessions and your stats will appear here
            </Text>
          </View>
        )}

        {/* Stats Summary */}
        {hasData && (
          <>
            {sectionTitle('Your Stats')}
            <View
              style={{
                marginHorizontal: 16,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <StatChip
                label="Total Sessions"
                value={String(totalSessions)}
                icon={<Clock size={14} color={C.textSecondary} />}
                C={C}
              />
              <StatChip
                label="Total Time"
                value={totalTimeDisplay}
                icon={<Clock size={14} color={C.textSecondary} />}
                C={C}
              />
              <StatChip
                label="Goals Achieved"
                value={String(goalsAchieved)}
                icon={<Target size={14} color={C.textSecondary} />}
                C={C}
              />
              <StatChip
                label="Active Goals"
                value={String(goalsActive)}
                icon={<Target size={14} color={C.textSecondary} />}
                C={C}
              />
            </View>
          </>
        )}

        {/* Most Used */}
        {totalSessions > 0 && topStopwatches.length > 0 && (
          <>
            {sectionTitle('Most Used')}
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
              }}
            >
              {topStopwatches.map((sw, idx) => {
                const sessionCountLabel = sw.sessionCount === 1 ? '1 session' : `${sw.sessionCount} sessions`;
                const timeLabel = formatTotalTime(sw.totalTime);
                const isLast = idx === topStopwatches.length - 1;
                return (
                  <View key={sw.id}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: sw.color || C.primary,
                        }}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: '500',
                          color: C.text,
                        }}
                        numberOfLines={1}
                      >
                        {sw.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: C.textSecondary,
                          marginRight: 8,
                        }}
                      >
                        {sessionCountLabel}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: C.text,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {timeLabel}
                      </Text>
                    </View>
                    {!isLast && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: C.border,
                          marginLeft: 38,
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface StatChipProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  C: ReturnType<typeof useColors>;
}

function StatChip({ label, value, C }: StatChipProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: '46%',
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: C.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '800',
          color: C.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
