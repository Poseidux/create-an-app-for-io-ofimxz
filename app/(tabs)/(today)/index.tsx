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
import { TimerConfig, getTimerConfigs, deleteTimerConfig } from '@/utils/timer-storage';
import { loadTimerCategories, TimerCategory } from '@/utils/timer-category-storage';

// ─── Segment type ─────────────────────────────────────────────────────────────

type Segment = 'stopwatches' | 'timers';

// ─── Preset Templates ─────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'running',    emoji: '🏃', name: 'Running',    color: '#22c55e' },
  { key: 'swimming',   emoji: '🏊', name: 'Swimming',   color: '#38bdf8' },
  { key: 'cycling',   emoji: '🚴', name: 'Cycling',    color: '#fb923c' },
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

// ─── Category Chips (Stopwatches) ─────────────────────────────────────────────

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
                console.log(`[TodayScreen] SW category chip pressed: ${cat.id}`);
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
              console.log(`[TodayScreen] Preset chip tapped: ${preset.key}`);
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
  const [editingLapIndex, setEditingLapIndex] = useState<string | null>(null);
  const [editingLapNote, setEditingLapNote] = useState('');
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  useEffect(() => {
    setNoteText(sw.note ?? '');
  }, [sw.note, visible]);

  useEffect(() => {
    if (!visible) {
      setEditingLapIndex(null);
      setEditingLapNote('');
    }
  }, [visible]);

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
      console.log(`[DetailsSheet] Android inline lap note edit: lapId=${lap.id}`);
      setEditingLapNote(lap.note ?? '');
      setEditingLapIndex(lap.id);
    }
  };

  const handleAndroidLapNoteSave = (lapId: string) => {
    console.log(`[DetailsSheet] Android lap note saved: lapId=${lapId}, note="${editingLapNote}"`);
    onUpdateLapNote(lapId, editingLapNote);
    setEditingLapIndex(null);
    setEditingLapNote('');
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
                  const isEditingThisLap = editingLapIndex === lap.id;

                  return (
                    <View key={lap.id}>
                      <Pressable
                        onLongPress={() => handleLapLongPress(lap)}
                        delayLongPress={400}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          backgroundColor: isEditingThisLap
                            ? C.surfaceSecondary
                            : pressed
                            ? C.surfaceSecondary
                            : rowBg,
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
                      {isEditingThisLap && (
                        <View
                          style={{
                            paddingHorizontal: 14,
                            paddingBottom: 10,
                            backgroundColor: C.surfaceSecondary,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: C.card,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: C.border,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              marginBottom: 8,
                            }}
                          >
                            <TextInput
                              value={editingLapNote}
                              onChangeText={setEditingLapNote}
                              placeholder="Add a note for this lap..."
                              placeholderTextColor={C.placeholder}
                              autoFocus
                              returnKeyType="done"
                              onSubmitEditing={() => handleAndroidLapNoteSave(lap.id)}
                              style={{
                                fontSize: 14,
                                color: C.text,
                                padding: 0,
                                margin: 0,
                              }}
                            />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                              onPress={() => {
                                console.log(`[DetailsSheet] Android lap note edit cancelled: lapId=${lap.id}`);
                                setEditingLapIndex(null);
                                setEditingLapNote('');
                              }}
                              style={({ pressed }) => ({
                                flex: 1,
                                alignItems: 'center',
                                paddingVertical: 7,
                                borderRadius: 8,
                                backgroundColor: C.chipBackground,
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>
                                Cancel
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleAndroidLapNoteSave(lap.id)}
                              style={({ pressed }) => ({
                                flex: 1,
                                alignItems: 'center',
                                paddingVertical: 7,
                                borderRadius: 8,
                                backgroundColor: C.primary,
                                opacity: pressed ? 0.7 : 1,
                              })}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                                Save
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
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

  const activeLabel = (() => {
    switch (goal.goalType) {
      case 'target_duration':
        return goal.targetMs != null ? `Goal: ${formatTime(goal.targetMs)}` : 'Goal';
      case 'target_laps':
        return goal.targetLaps != null ? `Goal: ${goal.targetLaps} laps` : 'Goal';
      case 'beat_personal_best':
        return goal.personalBestMs != null ? `Goal: ${formatTime(goal.personalBestMs)}` : 'Goal';
      case 'complete_countdown':
        return 'Goal: Complete';
      case 'complete_all_rounds':
        return 'Goal: Complete';
      default:
        return 'Goal';
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

            <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 0 }} />

            {goal !== null && (
              <>
                <View style={{ paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                  <GoalBadge goal={goal} swColor={swColor} />
                </View>
                <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 0 }} />
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
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

// ─── Stopwatch Empty State ────────────────────────────────────────────────────

function StopwatchEmptyState({ onAdd }: { onAdd: () => void }) {
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
          console.log('[TodayScreen] SW empty state "Add Stopwatch" pressed');
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

// ─── Timer Runtime ─────────────────────────────────────────────────────────────

interface TimerRuntime {
  configId: string;
  isRunning: boolean;
  phase: 'work' | 'rest' | 'countdown';
  currentRound: number;
  remainingMs: number;
  accumulatedMs: number;
  startedAt: number | null;
  isComplete: boolean;
}

function makeInitialRuntime(config: TimerConfig): TimerRuntime {
  const phase: 'work' | 'rest' | 'countdown' = config.mode === 'countdown' ? 'countdown' : 'work';
  const remainingMs = config.mode === 'countdown'
    ? (config.countdownMs ?? 0)
    : (config.workMs ?? 0);
  return {
    configId: config.id,
    isRunning: false,
    phase,
    currentRound: 1,
    remainingMs,
    accumulatedMs: 0,
    startedAt: null,
    isComplete: false,
  };
}

function getRemainingMs(rt: TimerRuntime, config: TimerConfig): number {
  if (!rt.isRunning || rt.startedAt === null) return rt.remainingMs;
  const elapsed = Date.now() - rt.startedAt + rt.accumulatedMs;
  const phaseDuration = rt.phase === 'countdown'
    ? (config.countdownMs ?? 0)
    : rt.phase === 'work'
    ? (config.workMs ?? 0)
    : (config.restMs ?? 0);
  return Math.max(0, phaseDuration - elapsed);
}

// ─── Timer Goal Badge ─────────────────────────────────────────────────────────

function TimerGoalBadge({ goal, timerColor }: { goal: ItemGoal; timerColor: string }) {
  if (goal.status === 'achieved') {
    return (
      <View
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          backgroundColor: 'rgba(52,199,89,0.12)',
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 11, color: '#34C759', fontWeight: '600' }}>
          ✓ Goal achieved
        </Text>
      </View>
    );
  }

  if (goal.status === 'missed') {
    return (
      <View
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          backgroundColor: 'rgba(180,180,180,0.12)',
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 11, color: '#999', fontWeight: '500' }}>
          ✗ Goal missed
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        backgroundColor: `${timerColor}18`,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 11, color: timerColor, fontWeight: '600' }}>
        Goal: Complete
      </Text>
    </View>
  );
}

// ─── Timer Card ───────────────────────────────────────────────────────────────

interface TimerCardProps {
  config: TimerConfig;
  runtime: TimerRuntime;
  goal?: ItemGoal | null;
  categoryName?: string | null;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function TimerCard({ config, runtime, goal, categoryName, onStart, onPause, onReset, onDelete, onEdit }: TimerCardProps) {
  const C = useColors();
  const timerFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
  const swColor = config.color;

  const remaining = getRemainingMs(runtime, config);
  const remainingDisplay = formatTime(remaining);

  const totalRounds = config.rounds ?? 1;
  const modeLabel = config.mode === 'countdown' ? 'Countdown' : config.mode === 'interval' ? 'Interval' : 'HIIT';
  const phaseLabel = runtime.phase === 'work' ? 'WORK' : runtime.phase === 'rest' ? 'REST' : '';

  const cardBg = runtime.isRunning ? `${swColor}0a` : C.card;
  const cardBorderColor = runtime.isRunning ? `${swColor}40` : C.border;

  const secondaryInfo = (() => {
    if (config.mode === 'countdown' && config.countdownMs) {
      const totalSec = Math.floor(config.countdownMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      let dur = '';
      if (days > 0) dur = `${days}d ${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`.trim();
      else if (hours > 0) dur = `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
      else if (mins > 0) dur = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
      else dur = `${secs}s`;
      return dur + ' total';
    }
    if (config.mode === 'interval' || config.mode === 'hiit') {
      return `Round ${runtime.currentRound} / ${totalRounds}`;
    }
    return null;
  })();

  const handleStartPause = () => {
    console.log(`[TodayScreen] TimerCard ${runtime.isRunning ? 'Pause' : 'Start'} pressed: id=${config.id}, name="${config.name}"`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (runtime.isRunning) onPause(); else onStart();
  };

  const handleReset = () => {
    console.log(`[TodayScreen] TimerCard Reset pressed: id=${config.id}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReset();
  };

  const handleDelete = () => {
    console.log(`[TodayScreen] TimerCard Delete pressed: id=${config.id}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Timer?',
      `"${config.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log(`[TodayScreen] TimerCard Delete confirmed: id=${config.id}`);
            onDelete();
          },
        },
      ]
    );
  };

  const doneColor = '#34C759';

  return (
    <Pressable
      onLongPress={() => {
        console.log(`[TodayScreen] TimerCard Long press (edit): id=${config.id}`);
        onEdit();
      }}
      delayLongPress={400}
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    >
      <View
        style={{
          backgroundColor: runtime.isComplete ? 'rgba(52,199,89,0.06)' : cardBg,
          borderRadius: 16,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: runtime.isComplete ? 'rgba(52,199,89,0.30)' : cardBorderColor,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {runtime.isRunning && !runtime.isComplete && (
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

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, paddingLeft: runtime.isRunning ? 20 : 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8 }}>
                {config.name}
              </Text>
              {categoryName != null && (
                <Text style={{ fontSize: 12, color: C.subtext, marginBottom: 4 }}>
                  {categoryName}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {runtime.isRunning && <PulsingDot color={swColor} />}
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 20,
                    backgroundColor: `${swColor}22`,
                  }}
                >
                  <Text style={{ fontSize: 11, color: swColor, fontWeight: '600' }}>
                    {modeLabel}
                  </Text>
                </View>
                {phaseLabel !== '' && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 20,
                      backgroundColor: runtime.phase === 'work' ? 'rgba(255,59,48,0.12)' : 'rgba(52,199,89,0.12)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: runtime.phase === 'work' ? '#FF3B30' : '#34C759',
                      }}
                    >
                      {phaseLabel}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              {runtime.isComplete ? (
                <Text style={{ fontSize: 22, fontWeight: '700', color: doneColor }}>
                  ✓ Done
                </Text>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '700',
                      fontFamily: timerFont,
                      color: runtime.isRunning ? swColor : C.text,
                      fontVariant: ['tabular-nums'],
                      letterSpacing: -0.5,
                      lineHeight: 34,
                      marginBottom: 4,
                    }}
                  >
                    {remainingDisplay}
                  </Text>
                  {secondaryInfo != null && (
                    <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '500' }}>
                      {secondaryInfo}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 0 }} />

          {goal != null && (
            <>
              <View style={{ paddingHorizontal: 0, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                <TimerGoalBadge goal={goal} timerColor={swColor} />
              </View>
              <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 0 }} />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {!runtime.isComplete && (
              <Pressable
                onPress={handleStartPause}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: runtime.isRunning ? swColor : C.primary,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  paddingVertical: 10,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {runtime.isRunning
                  ? <Pause size={15} color="#fff" fill="#fff" />
                  : <Play size={15} color="#fff" fill="#fff" />
                }
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {runtime.isRunning ? 'Pause' : 'Start'}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                flex: runtime.isComplete ? 1 : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingHorizontal: runtime.isComplete ? undefined : 14,
                backgroundColor: C.surfaceSecondary,
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingVertical: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <RotateCcw size={14} color={C.textSecondary} />
              {runtime.isComplete && (
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>
                  Reset
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => ({
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.dangerMuted,
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingVertical: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Trash2 size={14} color={C.danger} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Timer Category Chips ─────────────────────────────────────────────────────

interface TimerCategoryChipsProps {
  categories: TimerCategory[];
  selected: string;
  onSelect: (id: string) => void;
}

function TimerCategoryChips({ categories, selected, onSelect }: TimerCategoryChipsProps) {
  const C = useColors();
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
        {categories.map(cat => {
          const isSelected = selected === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                console.log(`[TodayScreen] Timer category chip pressed: ${cat.id}`);
                onSelect(cat.id);
              }}
              style={({ pressed }) => ({
                flexShrink: 0,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: isSelected ? C.chipSelected : C.chipBackground,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: isSelected ? C.chipSelectedText : C.chipText }}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Timer Empty State ────────────────────────────────────────────────────────

function TimerEmptyState({ onAdd }: { onAdd: () => void }) {
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
        No timers yet
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
        Tap + to create your first timer
      </Text>
      <Pressable
        onPress={() => {
          console.log('[TodayScreen] Timer empty state "Add Timer" pressed');
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
          Add Timer
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [segment, setSegment] = useState<Segment>('stopwatches');

  // ── Stopwatch state ──
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
  const { selectedCategory, categories } = useCategory();

  const [, setTick] = useState(0);
  const swIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anyRunning = stopwatches.some(sw => sw.isRunning);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [goalsMap, setGoalsMap] = useState<Record<string, ItemGoal>>({});
  const [detailsSwId, setDetailsSwId] = useState<string | null>(null);
  const detailsSw = detailsSwId ? stopwatches.find(sw => sw.id === detailsSwId) ?? null : null;

  // ── Timer state ──
  const [timerConfigs, setTimerConfigs] = useState<TimerConfig[]>([]);
  const [timerRuntimes, setTimerRuntimes] = useState<Record<string, TimerRuntime>>({});
  const [, setTimerTick] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerGoalsMap, setTimerGoalsMap] = useState<Record<string, ItemGoal>>({});
  const [timerCategories, setTimerCategories] = useState<TimerCategory[]>([]);
  const [selectedTimerCategory, setSelectedTimerCategory] = useState('all');
  const anyTimerRunning = Object.values(timerRuntimes).some(rt => rt.isRunning);

  // ── Load on focus ──
  useFocusEffect(
    useCallback(() => {
      console.log('[TodayScreen] Focus: loading goals, timer configs, timer categories');
      Promise.all([getGoals(), getTimerConfigs(), loadTimerCategories()]).then(([goals, configs, cats]) => {
        const map: Record<string, ItemGoal> = {};
        for (const g of goals) { map[g.itemId] = g; }
        setGoalsMap(map);
        setTimerGoalsMap(map);

        setTimerConfigs(configs);
        setTimerRuntimes(prev => {
          const next = { ...prev };
          for (const cfg of configs) {
            if (!next[cfg.id]) next[cfg.id] = makeInitialRuntime(cfg);
          }
          for (const id of Object.keys(next)) {
            if (!configs.find(c => c.id === id)) delete next[id];
          }
          return next;
        });
        setTimerCategories(cats);
        console.log(`[TodayScreen] Loaded ${goals.length} goal(s), ${configs.length} timer(s), ${cats.length} timer categories`);
      });
    }, [])
  );

  // ── Stopwatch tick ──
  useEffect(() => {
    if (anyRunning) {
      swIntervalRef.current = setInterval(() => setTick(t => t + 1), 100);
    } else {
      if (swIntervalRef.current) { clearInterval(swIntervalRef.current); swIntervalRef.current = null; }
    }
    return () => { if (swIntervalRef.current) { clearInterval(swIntervalRef.current); swIntervalRef.current = null; } };
  }, [anyRunning]);

  // ── Timer tick ──
  useEffect(() => {
    if (anyTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerTick(t => t + 1);
        setTimerRuntimes(prev => {
          let changed = false;
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            const rt = next[id];
            if (!rt.isRunning || rt.isComplete) continue;
            const cfg = timerConfigs.find(c => c.id === id);
            if (!cfg) continue;
            const remaining = getRemainingMs(rt, cfg);
            if (remaining <= 0) {
              if (cfg.mode === 'countdown') {
                next[id] = { ...rt, isRunning: false, remainingMs: 0, isComplete: true };
                console.log(`[TodayScreen] Countdown complete: id=${id}`);
                markGoalAchieved(id).then(() => {
                  getGoals().then(goals => {
                    const map: Record<string, ItemGoal> = {};
                    for (const g of goals) { map[g.itemId] = g; }
                    setTimerGoalsMap(map);
                  });
                });
              } else {
                if (rt.phase === 'work') {
                  next[id] = { ...rt, phase: 'rest', remainingMs: cfg.restMs ?? 0, accumulatedMs: 0, startedAt: Date.now() };
                  console.log(`[TodayScreen] Switching to REST: id=${id}, round=${rt.currentRound}`);
                } else {
                  const nextRound = rt.currentRound + 1;
                  const totalRounds = cfg.rounds ?? 1;
                  if (nextRound > totalRounds) {
                    next[id] = { ...rt, isRunning: false, remainingMs: 0, isComplete: true };
                    console.log(`[TodayScreen] All rounds complete: id=${id}`);
                    markGoalAchieved(id).then(() => {
                      getGoals().then(goals => {
                        const map: Record<string, ItemGoal> = {};
                        for (const g of goals) { map[g.itemId] = g; }
                        setTimerGoalsMap(map);
                      });
                    });
                  } else {
                    next[id] = { ...rt, phase: 'work', currentRound: nextRound, remainingMs: cfg.workMs ?? 0, accumulatedMs: 0, startedAt: Date.now() };
                    console.log(`[TodayScreen] Starting round ${nextRound}: id=${id}`);
                  }
                }
              }
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 100);
    } else {
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    }
    return () => { if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } };
  }, [anyTimerRunning, timerConfigs]);

  // ── Stopwatch handlers ──
  const openAddStopwatch = useCallback(() => {
    if (!canAddStopwatch) {
      console.log('[TodayScreen] Free tier limit reached — redirecting to paywall');
      router.push('/paywall');
      return;
    }
    console.log('[TodayScreen] Header + button pressed — opening stopwatch modal');
    router.push('/stopwatch-modal');
  }, [router, canAddStopwatch]);

  const openEditStopwatch = useCallback((id: string) => {
    console.log(`[TodayScreen] Open edit modal for stopwatch id=${id}`);
    router.push(`/stopwatch-modal?edit=${id}`);
  }, [router]);

  const handlePresetTap = useCallback((preset: typeof PRESETS[0]) => {
    console.log(`[TodayScreen] Preset tapped: ${preset.key}`);
    if (!canAddStopwatch) {
      console.log('[TodayScreen] Preset: free tier limit — redirecting to paywall');
      router.push('/paywall');
      return;
    }
    addStopwatch(preset.name, preset.color, undefined);
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [canAddStopwatch, addStopwatch, router]);

  const handleReset = useCallback(async (id: string) => {
    const sw = stopwatches.find(s => s.id === id);
    if (!sw) return;
    const elapsedMs = getElapsedMs(sw);
    console.log(`[TodayScreen] Reset & Save: id=${id}, totalTime=${elapsedMs}ms`);
    if (elapsedMs > 0) {
      const categoryName = sw.category
        ? (categories.find(c => c.id === sw.category)?.name ?? sw.category)
        : '';
      const session = {
        id: Math.random().toString(36).slice(2),
        stopwatchId: sw.id,
        stopwatchName: sw.name,
        category: categoryName,
        color: sw.color ?? DEFAULT_STOPWATCH_COLOR,
        totalTime: elapsedMs,
        laps: sw.laps ?? [],
        note: sw.note,
        startedAt: new Date(Date.now() - elapsedMs).toISOString(),
        endedAt: new Date().toISOString(),
      };
      console.log(`[TodayScreen] Saving session: id=${session.id}`);
      await saveSession(session);

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
          console.log(`[TodayScreen] Goal achieved for id=${id}`);
          await markGoalAchieved(id);
        } else {
          console.log(`[TodayScreen] Goal missed for id=${id}`);
          await markGoalMissed(id);
        }
        getGoals().then(goals => {
          const map: Record<string, ItemGoal> = {};
          for (const g of goals) { map[g.itemId] = g; }
          setGoalsMap(map);
        });
      }
    }
    resetStopwatch(id);
  }, [stopwatches, resetStopwatch, categories]);

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
    console.log(`[TodayScreen] Lap recorded: id=${id}, lapNumber=${lap.lapNumber}, lapTime=${lapTime}ms`);
    addLap(id, lap);
  }, [stopwatches, addLap]);

  // ── Timer handlers ──
  const handleTimerStart = useCallback((id: string) => {
    console.log(`[TodayScreen] Timer start: id=${id}`);
    setTimerRuntimes(prev => {
      const rt = prev[id];
      if (!rt) return prev;
      return { ...prev, [id]: { ...rt, isRunning: true, startedAt: Date.now(), accumulatedMs: 0 } };
    });
  }, []);

  const handleTimerPause = useCallback((id: string) => {
    console.log(`[TodayScreen] Timer pause: id=${id}`);
    setTimerRuntimes(prev => {
      const rt = prev[id];
      if (!rt || !rt.isRunning || rt.startedAt === null) return prev;
      const cfg = timerConfigs.find(c => c.id === id);
      if (!cfg) return prev;
      const remaining = getRemainingMs(rt, cfg);
      const phaseDuration = rt.phase === 'countdown'
        ? (cfg.countdownMs ?? 0)
        : rt.phase === 'work'
        ? (cfg.workMs ?? 0)
        : (cfg.restMs ?? 0);
      const elapsed = phaseDuration - remaining;
      return { ...prev, [id]: { ...rt, isRunning: false, remainingMs: remaining, accumulatedMs: elapsed, startedAt: null } };
    });
  }, [timerConfigs]);

  const handleTimerReset = useCallback((id: string) => {
    console.log(`[TodayScreen] Timer reset: id=${id}`);
    const cfg = timerConfigs.find(c => c.id === id);
    if (!cfg) return;
    const rt = timerRuntimes[id];
    if (rt && !rt.isComplete && (rt.accumulatedMs > 0 || rt.startedAt !== null)) {
      console.log(`[TodayScreen] Marking goal missed on reset: id=${id}`);
      markGoalMissed(id).then(() => {
        getGoals().then(goals => {
          const map: Record<string, ItemGoal> = {};
          for (const g of goals) { map[g.itemId] = g; }
          setTimerGoalsMap(map);
        });
      });
    }
    setTimerRuntimes(prev => ({ ...prev, [id]: makeInitialRuntime(cfg) }));
  }, [timerConfigs, timerRuntimes]);

  const handleTimerDelete = useCallback(async (id: string) => {
    console.log(`[TodayScreen] Timer delete: id=${id}`);
    await deleteTimerConfig(id);
    setTimerConfigs(prev => prev.filter(c => c.id !== id));
    setTimerRuntimes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ── Derived ──
  const filteredStopwatches = selectedCategory === 'all'
    ? stopwatches
    : stopwatches.filter(sw => sw.category === selectedCategory);

  const filteredTimerConfigs = selectedTimerCategory === 'all'
    ? timerConfigs
    : timerConfigs.filter(c => c.category === selectedTimerCategory);

  const listBottomPad = insets.bottom + 100;

  const prevSwCountRef = useRef(filteredStopwatches.length);
  useEffect(() => {
    if (filteredStopwatches.length > prevSwCountRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    prevSwCountRef.current = filteredStopwatches.length;
  }, [filteredStopwatches.length]);

  const showSwEmpty = isLoaded && filteredStopwatches.length === 0;
  const showTimerEmpty = timerConfigs.length === 0;
  const showTimerCategoryChips = timerCategories.length > 0;

  const handleAddPress = () => {
    if (segment === 'stopwatches') {
      console.log('[TodayScreen] Header + pressed for stopwatches');
      openAddStopwatch();
    } else {
      console.log('[TodayScreen] Header + pressed for timers');
      router.push('/timer-modal');
    }
  };

  const segStopwatches = 'stopwatches' as const;
  const segTimers = 'timers' as const;
  const segStopwatchesLabel = 'Stopwatches';
  const segTimersLabel = 'Timers';

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
            Today
          </Text>
          <Pressable
            onPress={handleAddPress}
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

        {/* Segmented control */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surfaceSecondary, borderRadius: 10, padding: 2 }}>
          {([segStopwatches, segTimers] as const).map(seg => {
            const isActive = segment === seg;
            const label = seg === 'stopwatches' ? segStopwatchesLabel : segTimersLabel;
            const bgColor = isActive ? C.card : 'transparent';
            const textColor = isActive ? C.text : C.textSecondary;
            return (
              <Pressable
                key={seg}
                onPress={() => {
                  console.log(`[TodayScreen] Segment pressed: ${seg}`);
                  setSegment(seg);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: bgColor,
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Stopwatch sub-header */}
        {segment === 'stopwatches' && (
          <>
            <CategoryChips />
            <Pressable
              onPress={() => {
                console.log('[TodayScreen] Presets toggle pressed');
                setPresetsExpanded(v => !v);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, flex: 1 }}>
                Quick Presets
              </Text>
              <ChevronDown
                size={16}
                color={C.textSecondary}
                style={{ transform: [{ rotate: presetsExpanded ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {presetsExpanded && (
              <PresetChips onPresetTap={(preset) => {
                handlePresetTap(preset);
                setPresetsExpanded(false);
              }} />
            )}
          </>
        )}

        {/* Timer sub-header */}
        {segment === 'timers' && showTimerCategoryChips && (
          <TimerCategoryChips
            categories={timerCategories}
            selected={selectedTimerCategory}
            onSelect={setSelectedTimerCategory}
          />
        )}

        <View style={{ height: 1, backgroundColor: C.separator }} />
      </View>

      {/* Stopwatches content */}
      {segment === 'stopwatches' && (
        <>
          <View style={{ flex: 1, display: showSwEmpty ? 'flex' : 'none' }}>
            <StopwatchEmptyState onAdd={openAddStopwatch} />
          </View>
          <FlatList
            style={{ flex: 1, display: showSwEmpty ? 'none' : 'flex' }}
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
                  onStart={() => startStopwatch(item.id)}
                  onPause={() => pauseStopwatch(item.id)}
                  onReset={() => handleReset(item.id)}
                  onDelete={() => handleDelete(item.id)}
                  onMoveUp={() => handleMoveUp(item.id)}
                  onMoveDown={() => handleMoveDown(item.id)}
                  onLongPress={() => openEditStopwatch(item.id)}
                  onLap={() => handleLap(item.id)}
                  onOpenDetails={() => {
                    console.log(`[TodayScreen] Open details for id=${item.id}`);
                    setDetailsSwId(item.id);
                  }}
                />
              );
            }}
          />
        </>
      )}

      {/* Timers content */}
      {segment === 'timers' && (
        showTimerEmpty ? (
          <TimerEmptyState onAdd={() => router.push('/timer-modal')} />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={filteredTimerConfigs}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: listBottomPad }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ fontSize: 15, color: C.textSecondary }}>
                  No timers in this category.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const rt = timerRuntimes[item.id] ?? makeInitialRuntime(item);
              const goal = timerGoalsMap[item.id] ?? null;
              const catName = item.category
                ? (timerCategories.find(c => c.id === item.category)?.name ?? null)
                : null;
              return (
                <TimerCard
                  config={item}
                  runtime={rt}
                  goal={goal}
                  categoryName={catName}
                  onStart={() => handleTimerStart(item.id)}
                  onPause={() => handleTimerPause(item.id)}
                  onReset={() => handleTimerReset(item.id)}
                  onDelete={() => handleTimerDelete(item.id)}
                  onEdit={() => {
                    console.log(`[TodayScreen] Edit timer: id=${item.id}`);
                    router.push(`/timer-modal?edit=${item.id}`);
                  }}
                />
              );
            }}
          />
        )
      )}

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
