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
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  Flag,
  FileText,
  X,
} from 'lucide-react-native';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { useCategory } from '@/contexts/CategoryContext';
import { useColors } from '@/constants/Colors';
import { Stopwatch, Lap, getElapsedMs, formatTime, getDays, DEFAULT_STOPWATCH_COLOR } from '@/types/stopwatch';
import { saveSession } from '@/utils/session-storage';
import {
  ItemGoal,
  getGoals,
  getGoalForItem,
  markGoalAchieved,
  markGoalMissed,
} from '@/utils/goal-storage';

// ─── Preset Templates ─────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'running',    emoji: '🏃', name: 'Running',    color: '#22c55e' },
  { key: 'swimming',   emoji: '🏊', name: 'Swimming',   color: '#38bdf8' },
  { key: 'cycling',    emoji: '🚴', name: 'Cycling',    color: '#fb923c' },
  { key: 'workout',    emoji: '💪', name: 'Workout',    color: '#f87171' },
  { key: 'study',      emoji: '📚', name: 'Study',      color: '#a78bfa' },
  { key: 'meditation', emoji: '🧘', name: 'Meditation', color: '#2dd4bf' },
  { key: 'sport',      emoji: '⚽', name: 'Sport',      color: '#fbbf24' },
];

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

// ─── Category Chips ───────────────────────────────────────────────────────────

function CategoryChips() {
  const { categories, selectedCategory, setSelectedCategory } = useCategory();
  const C = useColors();
  const allCategories = [{ id: 'all', name: 'All' }, ...categories.filter(c => c.id !== 'all')];

  return (
    <View style={{ height: 48, overflow: 'hidden' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 8,
          height: 48,
        }}
      >
        {allCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const chipBg = isSelected ? C.chipSelected : C.chipBackground;
          const chipTextColor = isSelected ? C.chipSelectedText : C.chipText;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                console.log(`[StopwatchesScreen] Category chip pressed: ${cat.id}`);
                setSelectedCategory(cat.id);
              }}
              style={({ pressed }) => ({
                flexShrink: 0,
                flexGrow: 0,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: chipBg,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: chipTextColor,
                  flexShrink: 0,
                }}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Preset Chips ─────────────────────────────────────────────────────────────

interface PresetChipsProps {
  onPresetTap: (preset: typeof PRESETS[0]) => void;
}

function PresetChips({ onPresetTap }: PresetChipsProps) {
  const C = useColors();
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
        {PRESETS.map(preset => (
          <Pressable
            key={preset.key}
            onPress={() => {
              console.log(`[StopwatchesScreen] Preset chip tapped: ${preset.key}`);
              onPresetTap(preset);
            }}
            style={({ pressed }) => ({
              flexShrink: 0,
              flexGrow: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: `${preset.color}18`,
              borderWidth: 1,
              borderColor: `${preset.color}40`,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13 }}>{preset.emoji}</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: preset.color }}>
              {preset.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Details Bottom Sheet ─────────────────────────────────────────────────────

interface DetailsSheetProps {
  sw: Stopwatch;
  visible: boolean;
  onClose: () => void;
  onUpdateNote: (note: string) => void;
  onUpdateLapNote: (lapId: string, note: string) => void;
}

function DetailsSheet({ sw, visible, onClose, onUpdateNote, onUpdateLapNote }: DetailsSheetProps) {
  const C = useColors();
  const [noteText, setNoteText] = useState(sw.note ?? '');
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  useEffect(() => {
    setNoteText(sw.note ?? '');
  }, [sw.note, visible]);

  const laps = sw.laps ?? [];
  const fastestLap = laps.length >= 2 ? laps.reduce((a, b) => a.lapTime < b.lapTime ? a : b) : null;
  const slowestLap = laps.length >= 2 ? laps.reduce((a, b) => a.lapTime > b.lapTime ? a : b) : null;

  const handleNoteBlur = () => {
    if (noteText !== (sw.note ?? '')) {
      console.log(`[DetailsSheet] Note updated for id=${sw.id}`);
      onUpdateNote(noteText);
    }
  };

  const handleLapLongPress = (lap: Lap) => {
    console.log(`[DetailsSheet] Lap long press for note: lapNumber=${lap.lapNumber}`);
    if (Platform.OS === 'ios') {
      Alert.prompt(
        `Lap ${lap.lapNumber} Note`,
        'Add a note for this lap',
        (text) => {
          if (text !== null) {
            console.log(`[DetailsSheet] Lap note saved: lapId=${lap.id}`);
            onUpdateLapNote(lap.id, text);
          }
        },
        'plain-text',
        lap.note ?? ''
      );
    } else {
      Alert.alert(
        `Lap ${lap.lapNumber} Note`,
        'Enter a note for this lap:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', onPress: () => onUpdateLapNote(lap.id, '') },
        ]
      );
    }
  };

  const swColor = sw.color ?? DEFAULT_STOPWATCH_COLOR;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }} numberOfLines={1}>
              {sw.name}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              console.log(`[DetailsSheet] Close pressed for id=${sw.id}`);
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
              marginLeft: 12,
            })}
          >
            <X size={16} color={C.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: C.subtext,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Note
          </Text>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 24,
            }}
          >
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              onBlur={handleNoteBlur}
              placeholder="Add a note for this stopwatch..."
              placeholderTextColor={C.placeholder}
              multiline
              style={{
                fontSize: 15,
                color: C.text,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {laps.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Flag size={13} color={C.textSecondary} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: C.subtext,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {`${laps.length} Lap${laps.length !== 1 ? 's' : ''}`}
                </Text>
                <Text style={{ fontSize: 11, color: C.subtext, marginLeft: 4 }}>
                  (long-press to add note)
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: 'hidden',
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: C.divider,
                  }}
                >
                  <View style={{ width: 36 }}>
                    <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>#</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>Lap Time</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600' }}>Split</Text>
                </View>
                {[...laps].reverse().map((lap) => {
                  const isFastest = fastestLap?.id === lap.id;
                  const isSlowest = slowestLap?.id === lap.id;
                  const rowBg = isFastest
                    ? 'rgba(52,199,89,0.08)'
                    : isSlowest
                    ? 'rgba(255,59,48,0.08)'
                    : 'transparent';
                  const lapTimeColor = isFastest ? '#34C759' : isSlowest ? '#FF3B30' : C.text;
                  const lapTimeDisplay = formatTime(lap.lapTime);
                  const splitTimeDisplay = formatTime(lap.splitTime);

                  return (
                    <Pressable
                      key={lap.id}
                      onLongPress={() => handleLapLongPress(lap)}
                      delayLongPress={400}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        backgroundColor: pressed ? C.surfaceSecondary : rowBg,
                      })}
                    >
                      <View style={{ width: 36 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>
                          {String(lap.lapNumber)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            fontFamily: timerFont,
                            color: lapTimeColor,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {lapTimeDisplay}
                        </Text>
                        {lap.note ? (
                          <Text style={{ fontSize: 11, color: C.subtext, marginTop: 2 }}>
                            {lap.note}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: timerFont,
                          color: C.textSecondary,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {splitTimeDisplay}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {laps.length === 0 && (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 32,
                backgroundColor: C.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Flag size={28} color={C.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, color: C.textSecondary }}>No laps recorded yet</Text>
              <Text style={{ fontSize: 12, color: C.subtext, marginTop: 4 }}>
                Tap Lap while the stopwatch is running
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Goal Badge ───────────────────────────────────────────────────────────────

function GoalBadge({ goal, swColor }: { goal: ItemGoal; swColor: string }) {
  const C = useColors();

  if (goal.status === 'achieved') {
    const badgeText = '✓ Goal achieved';
    return (
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          backgroundColor: 'rgba(52,199,89,0.12)',
        }}
      >
        <Text style={{ fontSize: 11, color: '#34C759', fontWeight: '600' }}>
          {badgeText}
        </Text>
      </View>
    );
  }

  if (goal.status === 'missed') {
    const badgeText = '✗ Goal missed';
    return (
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          backgroundColor: 'rgba(180,180,180,0.12)',
        }}
      >
        <Text style={{ fontSize: 11, color: '#999', fontWeight: '500' }}>
          {badgeText}
        </Text>
      </View>
    );
  }

  // Active goal — show target
  const activeLabel = (() => {
    switch (goal.goalType) {
      case 'target_duration':
        return goal.targetMs != null ? `🎯 Duration: ${formatTime(goal.targetMs)}` : '🎯 Duration goal';
      case 'target_laps':
        return goal.targetLaps != null ? `🎯 Target: ${goal.targetLaps} laps` : '🎯 Laps goal';
      case 'beat_personal_best':
        return goal.personalBestMs != null ? `🎯 Beat: ${formatTime(goal.personalBestMs)}` : '🎯 Personal best';
      case 'complete_countdown':
        return '🎯 Complete countdown';
      case 'complete_all_rounds':
        return '🎯 Complete all rounds';
      default:
        return '🎯 Goal';
    }
  })();

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        backgroundColor: `${swColor}18`,
      }}
    >
      <Text style={{ fontSize: 11, color: swColor, fontWeight: '600' }}>
        {activeLabel}
      </Text>
    </View>
  );
}

// ─── Stopwatch Card ───────────────────────────────────────────────────────────

interface CardProps {
  sw: Stopwatch;
  index: number;
  total: number;
  goal: ItemGoal | null;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLongPress: () => void;
  onLap: () => void;
  onOpenDetails: () => void;
}

function StopwatchCard({
  sw,
  index,
  total,
  goal,
  onStart,
  onPause,
  onReset,
  onDelete,
  onMoveUp,
  onMoveDown,
  onLongPress,
  onLap,
  onOpenDetails,
}: CardProps) {
  const C = useColors();
  const { categories } = useCategory();
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
  const days = getDays(elapsedMs);
  const dayLabel = days >= 1 ? (days === 1 ? '+1 day' : `+${days} days`) : null;
  const swColor = sw.color ?? DEFAULT_STOPWATCH_COLOR;

  const isWhiteIndicator = ['#ffffff', '#fff', '#FFFFFF', '#FFF'].includes(swColor.trim());
  const pauseTextColor = isWhiteIndicator ? '#000000' : '#ffffff';
  const startPauseTextColor = sw.isRunning ? pauseTextColor : '#ffffff';

  const statusText = sw.isRunning ? 'Running' : 'Paused';
  const statusBadgeBg = sw.isRunning ? `${swColor}22` : C.surfaceSecondary;
  const statusBadgeColor = sw.isRunning ? swColor : C.textSecondary;
  const cardBg = sw.isRunning ? `${swColor}0a` : C.card;
  const cardBorderColor = sw.isRunning ? `${swColor}40` : C.border;
  const startPauseBg = sw.isRunning ? swColor : C.primary;
  const startPauseLabel = sw.isRunning ? 'Pause' : 'Start';
  const timerColor = sw.isRunning ? swColor : C.text;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  const categoryLabel = sw.category
    ? (categories.find(c => c.id === sw.category)?.name ?? null)
    : null;

  const lapCount = (sw.laps ?? []).length;
  const lapCountLabel = lapCount > 0 ? `${lapCount} lap${lapCount !== 1 ? 's' : ''}` : null;

  const canLap = sw.isRunning || (sw.accumulatedMs > 0 && !sw.isRunning);

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

  const handleLap = () => {
    console.log(`[StopwatchCard] Lap pressed: id=${sw.id}, name="${sw.name}"`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onLap();
  };

  const handleReset = () => {
    console.log(`[StopwatchCard] Reset pressed: id=${sw.id}, name="${sw.name}"`);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Reset stopwatch?',
      'This will clear the elapsed time and save a session if time was recorded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Save',
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
            {/* Top row: name/status + timer/controls */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: C.text,
                    marginBottom: categoryLabel ? 3 : 6,
                  }}
                >
                  {sw.name}
                </Text>
                {categoryLabel !== null && (
                  <Text style={{ fontSize: 12, color: C.subtext, marginBottom: 6 }}>
                    {categoryLabel}
                  </Text>
                )}
                {/* Goal badge */}
                {goal !== null && (
                  <View style={{ marginBottom: 6 }}>
                    <GoalBadge goal={goal} swColor={swColor} />
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {sw.isRunning && <PulsingDot color={swColor} />}
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 20,
                      backgroundColor: statusBadgeBg,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: statusBadgeColor, fontWeight: '600' }}>
                      {statusText}
                    </Text>
                  </View>
                  {lapCountLabel !== null && (
                    <Pressable
                      onPress={() => {
                        console.log(`[StopwatchCard] Lap count badge pressed (open details): id=${sw.id}`);
                        onOpenDetails();
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 20,
                        backgroundColor: C.surfaceSecondary,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '500' }}>
                        {lapCountLabel}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    fontFamily: timerFont,
                    color: timerColor,
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -0.5,
                    lineHeight: 34,
                  }}
                >
                  {timeDisplay}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  {dayLabel !== null && (
                    <Text style={{ fontSize: 12, color: C.subtext, fontWeight: '500' }}>
                      {dayLabel}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 2 }}>
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
            </View>

            <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 12 }} />

            {/* Action buttons row */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Start/Pause */}
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
                  ? <Pause size={15} color={startPauseTextColor} fill={startPauseTextColor} />
                  : <Play size={15} color="#fff" fill="#fff" />
                }
                <Text style={{ fontSize: 13, fontWeight: '600', color: startPauseTextColor }}>
                  {startPauseLabel}
                </Text>
              </Pressable>

              {/* Lap */}
              <Pressable
                onPress={handleLap}
                disabled={!canLap}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: canLap ? `${swColor}18` : C.surfaceSecondary,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: !canLap ? 0.4 : pressed ? 0.7 : 1,
                })}
              >
                <Flag size={14} color={canLap ? swColor : C.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: canLap ? swColor : C.textSecondary }}>
                  Lap
                </Text>
              </Pressable>

              {/* Notes/Details */}
              <Pressable
                onPress={() => {
                  console.log(`[StopwatchCard] Details button pressed: id=${sw.id}`);
                  onOpenDetails();
                }}
                style={({ pressed }) => ({
                  width: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.surfaceSecondary,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <FileText size={15} color={C.textSecondary} />
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
                  width: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.dangerMuted,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 9,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Trash2 size={14} color={C.danger} />
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
          console.log('[StopwatchesScreen] Empty state "Add Stopwatch" pressed');
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
          boxShadow: '0 4px 16px rgba(0,122,255,0.30)',
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

export default function StopwatchesScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    stopwatches,
    isLoaded,
    canAddStopwatch,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    deleteStopwatch,
    moveUp,
    moveDown,
    addLap,
    updateNote,
    updateLapNote,
    addStopwatch,
  } = useStopwatch();
  const { selectedCategory } = useCategory();

  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anyRunning = stopwatches.some(sw => sw.isRunning);

  // Goals keyed by itemId
  const [goalsMap, setGoalsMap] = useState<Record<string, ItemGoal>>({});

  // Details sheet state
  const [detailsSwId, setDetailsSwId] = useState<string | null>(null);
  const detailsSw = detailsSwId ? stopwatches.find(sw => sw.id === detailsSwId) ?? null : null;

  // Load goals on focus
  useFocusEffect(
    useCallback(() => {
      console.log('[StopwatchesScreen] Focus: loading goals');
      getGoals().then(goals => {
        const map: Record<string, ItemGoal> = {};
        for (const g of goals) {
          map[g.itemId] = g;
        }
        setGoalsMap(map);
      });
    }, [])
  );

  // Tick interval for stopwatches only
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
    if (!canAddStopwatch) {
      console.log('[StopwatchesScreen] Free tier limit reached — redirecting to paywall');
      router.push('/paywall');
      return;
    }
    console.log('[StopwatchesScreen] Header + button pressed — opening stopwatch modal');
    router.push('/stopwatch-modal');
  }, [router, canAddStopwatch]);

  const openEditModal = useCallback((id: string) => {
    console.log(`[StopwatchesScreen] Open edit modal for id=${id}`);
    router.push(`/stopwatch-modal?edit=${id}`);
  }, [router]);

  const handlePresetTap = useCallback((preset: typeof PRESETS[0]) => {
    console.log(`[StopwatchesScreen] Preset tapped: ${preset.key}`);
    if (!canAddStopwatch) {
      console.log('[StopwatchesScreen] Preset: free tier limit — redirecting to paywall');
      router.push('/paywall');
      return;
    }
    addStopwatch(preset.name, preset.color, undefined);
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [canAddStopwatch, addStopwatch, router]);

  const handleStart = useCallback((id: string) => {
    startStopwatch(id);
  }, [startStopwatch]);

  const handlePause = useCallback((id: string) => {
    pauseStopwatch(id);
  }, [pauseStopwatch]);

  const handleReset = useCallback(async (id: string) => {
    const sw = stopwatches.find(s => s.id === id);
    if (!sw) return;
    const elapsedMs = getElapsedMs(sw);
    console.log(`[StopwatchesScreen] Reset & Save: id=${id}, totalTime=${elapsedMs}ms`);
    if (elapsedMs > 0) {
      const session = {
        id: Math.random().toString(36).slice(2),
        stopwatchId: sw.id,
        stopwatchName: sw.name,
        category: sw.category ?? '',
        color: sw.color ?? DEFAULT_STOPWATCH_COLOR,
        totalTime: elapsedMs,
        laps: sw.laps ?? [],
        note: sw.note,
        startedAt: new Date(Date.now() - elapsedMs).toISOString(),
        endedAt: new Date().toISOString(),
      };
      console.log(`[StopwatchesScreen] Saving session: id=${session.id}`);
      await saveSession(session);

      // Check goal
      const goal = await getGoalForItem(id);
      if (goal && goal.status === 'active') {
        const laps = sw.laps ?? [];
        let achieved = false;
        if (goal.goalType === 'target_duration' && goal.targetMs != null) {
          achieved = elapsedMs >= goal.targetMs;
        } else if (goal.goalType === 'target_laps' && goal.targetLaps != null) {
          achieved = laps.length >= goal.targetLaps;
        } else if (goal.goalType === 'beat_personal_best' && goal.personalBestMs != null) {
          achieved = elapsedMs <= goal.personalBestMs;
        }
        if (achieved) {
          console.log(`[StopwatchesScreen] Goal achieved for id=${id}`);
          await markGoalAchieved(id);
          // Refresh goals map
          getGoals().then(goals => {
            const map: Record<string, ItemGoal> = {};
            for (const g of goals) { map[g.itemId] = g; }
            setGoalsMap(map);
          });
        } else {
          console.log(`[StopwatchesScreen] Goal missed for id=${id}`);
          await markGoalMissed(id);
          getGoals().then(goals => {
            const map: Record<string, ItemGoal> = {};
            for (const g of goals) { map[g.itemId] = g; }
            setGoalsMap(map);
          });
        }
      }
    }
    resetStopwatch(id);
  }, [stopwatches, resetStopwatch]);

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

  const handleLap = useCallback((id: string) => {
    const sw = stopwatches.find(s => s.id === id);
    if (!sw) return;
    const elapsedMs = getElapsedMs(sw);
    const laps = sw.laps ?? [];
    const lastSplit = laps.length > 0 ? laps[laps.length - 1].splitTime : 0;
    const lapTime = elapsedMs - lastSplit;
    const lap: Lap = {
      id: Math.random().toString(36).slice(2),
      lapNumber: laps.length + 1,
      lapTime,
      splitTime: elapsedMs,
      timestamp: new Date().toISOString(),
    };
    console.log(`[StopwatchesScreen] Lap recorded: id=${id}, lapNumber=${lap.lapNumber}, lapTime=${lapTime}ms`);
    addLap(id, lap);
  }, [stopwatches, addLap]);

  const filteredStopwatches = selectedCategory === 'all'
    ? stopwatches
    : stopwatches.filter(sw => sw.category === selectedCategory);

  const listBottomPad = insets.bottom + 100;

  const prevCountRef = useRef(filteredStopwatches.length);
  useEffect(() => {
    if (filteredStopwatches.length > prevCountRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    prevCountRef.current = filteredStopwatches.length;
  }, [filteredStopwatches.length]);

  const showEmpty = isLoaded && filteredStopwatches.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.background }}>
        <View
          style={{
            height: 44,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: C.text,
            }}
          >
            Stopwatches
          </Text>

          <Pressable
            onPress={openAddModal}
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
        </View>

        <CategoryChips />
        <PresetChips onPresetTap={handlePresetTap} />
        <View style={{ height: 1, backgroundColor: C.separator }} />
      </View>

      <View style={{ flex: 1, display: showEmpty ? 'flex' : 'none' }}>
        <EmptyState onAdd={openAddModal} />
      </View>

      <FlatList
        style={{ flex: 1, display: showEmpty ? 'none' : 'flex' }}
        data={filteredStopwatches}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
        renderItem={({ item, index }) => {
          const swGoal = goalsMap[item.id] ?? null;
          return (
            <StopwatchCard
              sw={item}
              index={index}
              total={filteredStopwatches.length}
              goal={swGoal}
              onStart={() => handleStart(item.id)}
              onPause={() => handlePause(item.id)}
              onReset={() => handleReset(item.id)}
              onDelete={() => handleDelete(item.id)}
              onMoveUp={() => handleMoveUp(item.id)}
              onMoveDown={() => handleMoveDown(item.id)}
              onLongPress={() => openEditModal(item.id)}
              onLap={() => handleLap(item.id)}
              onOpenDetails={() => {
                console.log(`[StopwatchesScreen] Open details for id=${item.id}`);
                setDetailsSwId(item.id);
              }}
            />
          );
        }}
      />

      {/* Details bottom sheet */}
      {detailsSw && (
        <DetailsSheet
          sw={detailsSw}
          visible={detailsSwId !== null}
          onClose={() => setDetailsSwId(null)}
          onUpdateNote={(note) => updateNote(detailsSw.id, note)}
          onUpdateLapNote={(lapId, note) => updateLapNote(detailsSw.id, lapId, note)}
        />
      )}
    </View>
  );
}
