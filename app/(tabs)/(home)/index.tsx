import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Timer,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { Stopwatch, getElapsedMs, formatTime, DEFAULT_STOPWATCH_COLOR } from '@/types/stopwatch';

// ─── Colors ───────────────────────────────────────────────────────────────────

const LIGHT = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF1F5',
  text: '#0F1923',
  textSecondary: '#5A6A7A',
  primary: '#1A7FD4',
  primaryMuted: 'rgba(26,127,212,0.10)',
  accent: '#00C9A7',
  accentMuted: 'rgba(0,201,167,0.10)',
  danger: '#E53E3E',
  dangerMuted: 'rgba(229,62,62,0.10)',
  border: 'rgba(15,25,35,0.07)',
  divider: 'rgba(15,25,35,0.04)',
};

const DARK = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceSecondary: '#21262D',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  primary: '#1A7FD4',
  primaryMuted: 'rgba(26,127,212,0.15)',
  accent: '#00C9A7',
  accentMuted: 'rgba(0,201,167,0.10)',
  danger: '#E53E3E',
  dangerMuted: 'rgba(229,62,62,0.15)',
  border: 'rgba(230,237,243,0.08)',
  divider: 'rgba(230,237,243,0.04)',
};

function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK : LIGHT;
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity,
        marginRight: 5,
      }}
    />
  );
}

// ─── Stopwatch Card ───────────────────────────────────────────────────────────

interface CardProps {
  sw: Stopwatch;
  index: number;
  total: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLongPress: () => void;
}

function StopwatchCard({
  sw,
  index,
  total,
  onStart,
  onPause,
  onReset,
  onDelete,
  onMoveUp,
  onMoveDown,
  onLongPress,
}: CardProps) {
  const C = useColors();
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, [entranceAnim, index]);

  const elapsedMs = getElapsedMs(sw);
  const timeDisplay = formatTime(elapsedMs);
  const swColor = sw.color ?? DEFAULT_STOPWATCH_COLOR;
  const statusText = sw.isRunning ? 'Running' : 'Paused';
  const statusBadgeBg = sw.isRunning ? `${swColor}22` : C.surfaceSecondary;
  const statusBadgeColor = sw.isRunning ? swColor : C.textSecondary;
  const cardBg = sw.isRunning ? `${swColor}0a` : C.surface;
  const cardBorderColor = sw.isRunning ? `${swColor}40` : C.border;
  const startPauseBg = sw.isRunning ? swColor : C.primary;
  const startPauseLabel = sw.isRunning ? 'Pause' : 'Start';
  const timerColor = sw.isRunning ? swColor : C.text;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  const handleStartPause = () => {
    console.log(`[StopwatchCard] ${sw.isRunning ? 'Pause' : 'Start'} pressed: id=${sw.id}, name="${sw.name}"`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (sw.isRunning) {
      onPause();
    } else {
      onStart();
    }
  };

  const handleReset = () => {
    console.log(`[StopwatchCard] Reset pressed: id=${sw.id}, name="${sw.name}"`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Reset stopwatch?',
      'This will clear the elapsed time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            console.log(`[StopwatchCard] Reset confirmed: id=${sw.id}`);
            onReset();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    console.log(`[StopwatchCard] Delete pressed: id=${sw.id}, name="${sw.name}"`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    Alert.alert(
      'Delete stopwatch?',
      `"${sw.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[StopwatchCard] Delete confirmed: id=${sw.id}`);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onDelete();
          },
        },
      ]
    );
  };

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: entranceAnim,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onLongPress={() => {
          console.log(`[StopwatchCard] Long press: id=${sw.id}, name="${sw.name}"`);
          onLongPress();
        }}
        delayLongPress={400}
        style={{ marginHorizontal: 16, marginBottom: 12 }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            borderCurve: 'continuous',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: cardBorderColor,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {/* Running accent bar */}
          {sw.isRunning && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: swColor,
                zIndex: 1,
              }}
            />
          )}

          <View style={{ padding: 16, paddingLeft: sw.isRunning ? 20 : 16 }}>
            {/* Top row: name + status + timer */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
              {/* Left: name + status */}
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: C.text,
                    marginBottom: 6,
                  }}
                >
                  {sw.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {sw.isRunning && <PulsingDot color={swColor} />}
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 20,
                      backgroundColor: statusBadgeBg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: statusBadgeColor,
                        fontWeight: '600',
                      }}
                    >
                      {statusText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right: timer + reorder arrows */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '700',
                    fontFamily: timerFont,
                    color: timerColor,
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -0.5,
                    lineHeight: 38,
                  }}
                >
                  {timeDisplay}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
                  <Pressable
                    onPress={() => {
                      console.log(`[StopwatchCard] Move up pressed: id=${sw.id}`);
                      onMoveUp();
                    }}
                    disabled={isFirst}
                    style={({ pressed }) => ({
                      width: 32,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      backgroundColor: C.surfaceSecondary,
                      opacity: isFirst ? 0.3 : pressed ? 0.6 : 1,
                    })}
                  >
                    <ChevronUp size={14} color={C.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      console.log(`[StopwatchCard] Move down pressed: id=${sw.id}`);
                      onMoveDown();
                    }}
                    disabled={isLast}
                    style={({ pressed }) => ({
                      width: 32,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      backgroundColor: C.surfaceSecondary,
                      opacity: isLast ? 0.3 : pressed ? 0.6 : 1,
                    })}
                  >
                    <ChevronDown size={14} color={C.textSecondary} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 12 }} />

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Start / Pause */}
              <Pressable
                onPress={handleStartPause}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: startPauseBg,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {sw.isRunning
                  ? <Pause size={15} color="#fff" fill="#fff" />
                  : <Play size={15} color="#fff" fill="#fff" />
                }
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                  {startPauseLabel}
                </Text>
              </Pressable>

              {/* Reset */}
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: C.surfaceSecondary,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <RotateCcw size={14} color={C.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>
                  Reset
                </Text>
              </Pressable>

              {/* Delete */}
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: C.dangerMuted,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Trash2 size={14} color={C.danger} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.danger }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const C = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          borderCurve: 'continuous',
          backgroundColor: C.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Timer size={40} color={C.primary} />
      </View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: C.text,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        No stopwatches yet
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: C.textSecondary,
          textAlign: 'center',
          marginBottom: 28,
          lineHeight: 22,
        }}
      >
        Tap + to create your first stopwatch
      </Text>
      <Pressable
        onPress={() => {
          console.log('[HomeScreen] Empty state "Add Stopwatch" pressed');
          onAdd();
        }}
        style={({ pressed }) => ({
          backgroundColor: C.primary,
          borderRadius: 12,
          borderCurve: 'continuous',
          paddingHorizontal: 24,
          paddingVertical: 13,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: pressed ? 0.8 : 1,
          boxShadow: '0 4px 16px rgba(26,127,212,0.30)',
        })}
      >
        <Plus size={18} color="#fff" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
          Add Stopwatch
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    stopwatches,
    isLoaded,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    deleteStopwatch,
    moveUp,
    moveDown,
  } = useStopwatch();

  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anyRunning = stopwatches.some(sw => sw.isRunning);

  useEffect(() => {
    if (anyRunning) {
      intervalRef.current = setInterval(() => {
        setTick(t => t + 1);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [anyRunning]);

  const openAddModal = useCallback(() => {
    console.log('[HomeScreen] Open add stopwatch modal');
    router.push('/stopwatch-modal');
  }, [router]);

  const openEditModal = useCallback((id: string) => {
    console.log(`[HomeScreen] Open edit modal for id=${id}`);
    router.push(`/stopwatch-modal?edit=${id}`);
  }, [router]);

  const handleStart = useCallback((id: string) => {
    startStopwatch(id);
  }, [startStopwatch]);

  const handlePause = useCallback((id: string) => {
    pauseStopwatch(id);
  }, [pauseStopwatch]);

  const handleReset = useCallback((id: string) => {
    resetStopwatch(id);
  }, [resetStopwatch]);

  const handleDelete = useCallback((id: string) => {
    deleteStopwatch(id);
  }, [deleteStopwatch]);

  const handleMoveUp = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    moveUp(id);
  }, [moveUp]);

  const handleMoveDown = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    moveDown(id);
  }, [moveDown]);

  const fabBottom = insets.bottom + 80;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Stopwatch',
          headerRight: () => (
            <Pressable
              onPress={() => {
                console.log('[HomeScreen] Header + button pressed');
                openAddModal();
              }}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: C.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Plus size={20} color={C.primary} />
            </Pressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: C.background }}>
        {isLoaded && stopwatches.length === 0 ? (
          <EmptyState onAdd={openAddModal} />
        ) : (
          <FlatList
            data={stopwatches}
            keyExtractor={item => item.id}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingTop: 8, paddingBottom: fabBottom + 20 }}
            renderItem={({ item, index }) => (
              <StopwatchCard
                sw={item}
                index={index}
                total={stopwatches.length}
                onStart={() => handleStart(item.id)}
                onPause={() => handlePause(item.id)}
                onReset={() => handleReset(item.id)}
                onDelete={() => handleDelete(item.id)}
                onMoveUp={() => handleMoveUp(item.id)}
                onMoveDown={() => handleMoveDown(item.id)}
                onLongPress={() => openEditModal(item.id)}
              />
            )}
          />
        )}

        {stopwatches.length > 0 && (
          <Pressable
            onPress={() => {
              console.log('[HomeScreen] FAB + button pressed');
              openAddModal();
            }}
            style={({ pressed }) => ({
              position: 'absolute',
              bottom: fabBottom,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: C.primary,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(26,127,212,0.40)',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Plus size={24} color="#fff" />
          </Pressable>
        )}
      </View>
    </>
  );
}
