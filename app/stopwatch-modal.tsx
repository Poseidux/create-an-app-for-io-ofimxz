import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStopwatch } from '@/contexts/StopwatchContext';
import { useCategory } from '@/contexts/CategoryContext';
import { useColors } from '@/constants/Colors';
import { DEFAULT_STOPWATCH_COLOR, Lap, formatTime, getElapsedMs } from '@/types/stopwatch';
import { saveSession } from '@/utils/session-storage';
import { Flag, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE_PRIMARY = [
  { label: 'Green',  hex: '#22c55e' },
  { label: 'Sky',    hex: '#38bdf8' },
  { label: 'Violet', hex: '#a78bfa' },
  { label: 'Rose',   hex: '#fb7185' },
  { label: 'Amber',  hex: '#fbbf24' },
  { label: 'Orange', hex: '#fb923c' },
  { label: 'Teal',   hex: '#2dd4bf' },
  { label: 'Indigo', hex: '#818cf8' },
  { label: 'Pink',   hex: '#f472b6' },
  { label: 'Red',    hex: '#f87171' },
];

const PALETTE_ADDITIONAL = [
  { label: 'Warm Red',    hex: '#FF6B6B' },
  { label: 'Coral',       hex: '#FF8E53' },
  { label: 'Peach',       hex: '#FFA94D' },
  { label: 'Yellow',      hex: '#FFD43B' },
  { label: 'Gold',        hex: '#F9C74F' },
  { label: 'Light Blue',  hex: '#74C0FC' },
  { label: 'Blue 1',      hex: '#4DABF7' },
  { label: 'Blue 2',      hex: '#339AF0' },
  { label: 'Blue 3',      hex: '#228BE6' },
  { label: 'Dark Blue',   hex: '#1971C2' },
  { label: 'Mint',        hex: '#69DB7C' },
  { label: 'Green 1',     hex: '#51CF66' },
  { label: 'Green 2',     hex: '#40C057' },
  { label: 'Forest',      hex: '#2F9E44' },
  { label: 'Lime',        hex: '#94D82D' },
  { label: 'Lavender',    hex: '#DA77F2' },
  { label: 'Purple 1',    hex: '#CC5DE8' },
  { label: 'Purple 2',    hex: '#BE4BDB' },
  { label: 'Hot Pink',    hex: '#F783AC' },
  { label: 'Crimson',     hex: '#E64980' },
  { label: 'Silver',      hex: '#ADB5BD' },
  { label: 'Gray',        hex: '#868E96' },
  { label: 'Slate',       hex: '#495057' },
  { label: 'Charcoal',    hex: '#212529' },
  { label: 'White',       hex: '#FFFFFF' },
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({
  hex,
  label,
  isSelected,
  onPress,
  size = 36,
}: {
  hex: string;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  size?: number;
}) {
  const isWhite = hex === '#FFFFFF';
  const borderRadius = size / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius,
        backgroundColor: hex,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        borderWidth: isSelected ? 3 : isWhite ? 1 : 0,
        borderColor: isSelected ? '#007AFF' : isWhite ? '#C6C6C8' : 'transparent',
        boxShadow: isSelected
          ? `0 0 0 2px ${hex === '#FFFFFF' ? '#C6C6C8' : hex}`
          : '0 1px 3px rgba(0,0,0,0.15)',
      })}
    >
      {isSelected && (
        <View
          style={{
            width: size * 0.35,
            height: size * 0.35,
            borderRadius: size * 0.175,
            backgroundColor: isWhite ? '#007AFF' : '#ffffff',
          }}
        />
      )}
    </Pressable>
  );
}

// ─── Lap Row ──────────────────────────────────────────────────────────────────

interface LapRowProps {
  lap: Lap;
  isFastest: boolean;
  isSlowest: boolean;
  onLongPress: () => void;
}

function LapRow({ lap, isFastest, isSlowest, onLongPress }: LapRowProps) {
  const C = useColors();
  const lapTimeDisplay = formatTime(lap.lapTime);
  const splitTimeDisplay = formatTime(lap.splitTime);

  const rowBg = isFastest
    ? 'rgba(52,199,89,0.10)'
    : isSlowest
    ? 'rgba(255,59,48,0.10)'
    : 'transparent';

  const lapTimeColor = isFastest ? '#34C759' : isSlowest ? '#FF3B30' : C.text;
  const timerFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  return (
    <Pressable
      onLongPress={() => {
        console.log(`[StopwatchModal] Lap long press: lapNumber=${lap.lapNumber}`);
        onLongPress();
      }}
      delayLongPress={400}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 12,
        backgroundColor: pressed ? C.surfaceSecondary : rowBg,
        borderRadius: 8,
        borderCurve: 'continuous',
        marginBottom: 2,
      })}
    >
      <View style={{ width: 32 }}>
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
          <Text style={{ fontSize: 11, color: C.subtext, marginTop: 1 }}>
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
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function StopwatchModal() {
  const C = useColors();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { stopwatches, addStopwatch, renameStopwatch, addLap, clearLaps, updateNote, updateLapNote, resetStopwatch } = useStopwatch();
  const { categories, addCategory } = useCategory();

  const isEditing = Boolean(edit);
  const existing = isEditing ? stopwatches.find(sw => sw.id === edit) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(
    existing?.color ?? DEFAULT_STOPWATCH_COLOR
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    existing?.category ?? 'all'
  );
  const [newCatName, setNewCatName] = useState('');

  // ─── Lap / Timer state (only in edit mode) ────────────────────────────────
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isEditing || !existing) return;
    if (existing.isRunning) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 100);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isEditing, existing?.isRunning]);

  const handleCancel = () => {
    console.log('[StopwatchModal] Cancel pressed');
    router.back();
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cat = selectedCategoryId === 'all' ? undefined : selectedCategoryId;

    if (isEditing && edit) {
      console.log(`[StopwatchModal] Save rename: id=${edit}, name="${trimmed}", color="${selectedColor}", category="${cat}"`);
      renameStopwatch(edit, trimmed, selectedColor, cat);
    } else {
      console.log(`[StopwatchModal] Create stopwatch: name="${trimmed}", color="${selectedColor}", category="${cat}"`);
      addStopwatch(trimmed, selectedColor, cat);
    }
    router.back();
  };

  const handleSwatchPress = (hex: string, label: string) => {
    console.log(`[StopwatchModal] Color swatch pressed: ${label} (${hex})`);
    setSelectedColor(hex);
  };

  const handleCategoryPress = (id: string) => {
    console.log(`[StopwatchModal] Category chip pressed: ${id}`);
    setSelectedCategoryId(id);
  };

  const [pendingCatName, setPendingCatName] = useState<string | null>(null);

  const handleAddCategoryWithPending = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    console.log(`[StopwatchModal] Add category pressed: "${trimmed}"`);
    setPendingCatName(trimmed);
    await addCategory(trimmed);
    setNewCatName('');
  };

  React.useEffect(() => {
    if (!pendingCatName) return;
    const found = categories.find(c => c.name === pendingCatName && !c.isBuiltIn);
    if (found) {
      setSelectedCategoryId(found.id);
      setPendingCatName(null);
    }
  }, [categories, pendingCatName]);

  // ─── Lap recording ────────────────────────────────────────────────────────

  const handleLap = useCallback(() => {
    if (!existing || !edit) return;
    const elapsedMs = getElapsedMs(existing);
    const laps = existing.laps ?? [];
    const lastSplit = laps.length > 0 ? laps[laps.length - 1].splitTime : 0;
    const lapTime = elapsedMs - lastSplit;
    const lap: Lap = {
      id: Math.random().toString(36).slice(2),
      lapNumber: laps.length + 1,
      lapTime,
      splitTime: elapsedMs,
      timestamp: new Date().toISOString(),
    };
    console.log(`[StopwatchModal] Lap recorded: lapNumber=${lap.lapNumber}, lapTime=${lapTime}ms`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLap(edit, lap);
  }, [existing, edit, addLap]);

  const handleReset = useCallback(async () => {
    if (!existing || !edit) return;
    const elapsedMs = getElapsedMs(existing);
    console.log(`[StopwatchModal] Reset pressed: id=${edit}, totalTime=${elapsedMs}ms`);

    // Auto-save session if there was any time recorded
    if (elapsedMs > 0) {
      const session = {
        id: Math.random().toString(36).slice(2),
        stopwatchId: existing.id,
        stopwatchName: existing.name,
        category: existing.category ?? '',
        color: existing.color ?? DEFAULT_STOPWATCH_COLOR,
        totalTime: elapsedMs,
        laps: existing.laps ?? [],
        note: existing.note,
        startedAt: new Date(Date.now() - elapsedMs).toISOString(),
        endedAt: new Date().toISOString(),
      };
      console.log(`[StopwatchModal] Auto-saving session: id=${session.id}, totalTime=${elapsedMs}ms`);
      await saveSession(session);
    }

    resetStopwatch(edit);
  }, [existing, edit, resetStopwatch]);

  const handleEditNote = useCallback(() => {
    if (!edit) return;
    const currentNote = existing?.note ?? '';
    console.log(`[StopwatchModal] Edit note pressed: id=${edit}`);
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Stopwatch Note',
        'Add a note for this stopwatch',
        (text) => {
          if (text !== null) {
            console.log(`[StopwatchModal] Note saved: "${text}"`);
            updateNote(edit, text);
          }
        },
        'plain-text',
        currentNote
      );
    } else {
      Alert.alert(
        'Note',
        'Use the note field below to add a note.',
      );
    }
  }, [edit, existing, updateNote]);

  const handleLapLongPress = useCallback((lap: Lap) => {
    if (!edit) return;
    console.log(`[StopwatchModal] Lap long press for note: lapNumber=${lap.lapNumber}`);
    if (Platform.OS === 'ios') {
      Alert.prompt(
        `Lap ${lap.lapNumber} Note`,
        'Add a note for this lap',
        (text) => {
          if (text !== null) {
            console.log(`[StopwatchModal] Lap note saved: lapId=${lap.id}, note="${text}"`);
            updateLapNote(edit, lap.id, text);
          }
        },
        'plain-text',
        lap.note ?? ''
      );
    } else {
      Alert.alert('Lap Note', 'Long-press lap notes are only available on iOS.');
    }
  }, [edit, updateLapNote]);

  const title = isEditing ? 'Edit Stopwatch' : 'New Stopwatch';
  const submitLabel = isEditing ? 'Save' : 'Create';
  const canSubmit = name.trim().length > 0;
  const canAddCat = newCatName.trim().length > 0;

  // Lap stats
  const laps = existing?.laps ?? [];
  const fastestLap = laps.length >= 2 ? laps.reduce((a, b) => a.lapTime < b.lapTime ? a : b) : null;
  const slowestLap = laps.length >= 2 ? laps.reduce((a, b) => a.lapTime > b.lapTime ? a : b) : null;

  const sectionLabel = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.textSecondary,
    paddingHorizontal: 4,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  const swColor = existing?.color ?? DEFAULT_STOPWATCH_COLOR;
  const elapsedMs = existing ? getElapsedMs(existing) : 0;
  const timerDisplay = formatTime(elapsedMs);
  const timerFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  return (
    <View style={{ flex: 1, backgroundColor: C.card }}>
      {/* FIXED HEADER */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.border,
          }}
        >
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500' }}>
              Cancel
            </Text>
          </Pressable>

          <Text style={{ fontSize: 17, fontWeight: '600', color: C.text }}>
            {title}
          </Text>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => ({
              opacity: !canSubmit ? 0.4 : pressed ? 0.6 : 1,
              padding: 4,
            })}
          >
            <Text style={{ fontSize: 16, color: C.tint, fontWeight: '600' }}>
              {submitLabel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* KEYBOARD AWARE SCROLL AREA */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 120,
          }}
        >
          {/* ── Live timer + lap controls (edit mode only) ── */}
          {isEditing && existing && (
            <View
              style={{
                backgroundColor: C.background,
                borderRadius: 16,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: C.border,
                padding: 16,
                marginBottom: 20,
                alignItems: 'center',
              }}
            >
              {/* Timer display */}
              <Text
                style={{
                  fontSize: 40,
                  fontWeight: '800',
                  fontFamily: timerFont,
                  color: existing.isRunning ? swColor : C.text,
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -1.5,
                  marginBottom: 4,
                }}
              >
                {timerDisplay}
              </Text>

              {/* Note */}
              <Pressable
                onPress={handleEditNote}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 14,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Edit3 size={12} color={C.textSecondary} />
                <Text style={{ fontSize: 13, color: existing.note ? C.text : C.textSecondary }}>
                  {existing.note ? existing.note : 'Add note...'}
                </Text>
              </Pressable>

              {/* Lap + Reset buttons */}
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <Pressable
                  onPress={handleLap}
                  disabled={!existing.isRunning}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: existing.isRunning ? `${swColor}18` : C.surfaceSecondary,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    paddingVertical: 10,
                    opacity: !existing.isRunning ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  <Flag size={14} color={existing.isRunning ? swColor : C.textSecondary} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: existing.isRunning ? swColor : C.textSecondary,
                    }}
                  >
                    Lap
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: C.dangerMuted,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.danger }}>
                    Reset & Save
                  </Text>
                </Pressable>
              </View>

              {/* Lap list */}
              {laps.length > 0 && (
                <View style={{ width: '100%', marginTop: 14 }}>
                  <View style={{ height: 1, backgroundColor: C.divider, marginBottom: 8 }} />
                  {/* Column headers */}
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 }}>
                    <View style={{ width: 32 }}>
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
                  {[...laps].reverse().map(lap => (
                    <LapRow
                      key={lap.id}
                      lap={lap}
                      isFastest={fastestLap?.id === lap.id}
                      isSlowest={slowestLap?.id === lap.id}
                      onLongPress={() => handleLapLongPress(lap)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Name Input */}
          <View
            style={{
              backgroundColor: C.inputBg,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 8,
            }}
          >
            <TextInput
              autoFocus={!isEditing}
              value={name}
              onChangeText={setName}
              placeholder="Stopwatch name"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={{
                fontSize: 17,
                color: C.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 44,
                margin: 0,
              }}
            />
          </View>

          <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 24 }}>
            Give your stopwatch a descriptive name like "Morning Run" or "Sprint 1".
          </Text>

          {/* Category picker */}
          <Text style={sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}
            style={{ flexShrink: 0, marginBottom: 12 }}
          >
            {categories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              const chipBg = isSelected ? C.chipSelected : C.chipBackground;
              const chipTextColor = isSelected ? C.chipSelectedText : C.chipText;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: chipTextColor }}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Inline add category */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 28,
              paddingHorizontal: 4,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: C.inputBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 8 : 4,
              }}
            >
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="New category..."
                placeholderTextColor={C.placeholder}
                returnKeyType="done"
                onSubmitEditing={handleAddCategoryWithPending}
                style={{
                  fontSize: 14,
                  color: C.text,
                  padding: 0,
                  margin: 0,
                }}
              />
            </View>
            <Pressable
              onPress={handleAddCategoryWithPending}
              disabled={!canAddCat}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: canAddCat ? C.tint : C.chipBackground,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: canAddCat ? '#fff' : C.subtext,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>

          {/* Color picker — Primary */}
          <Text style={sectionLabel}>Indicator Color</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              paddingHorizontal: 4,
              marginBottom: 20,
            }}
          >
            {PALETTE_PRIMARY.map((swatch) => (
              <ColorSwatch
                key={swatch.hex}
                hex={swatch.hex}
                label={swatch.label}
                isSelected={selectedColor === swatch.hex}
                onPress={() => handleSwatchPress(swatch.hex, swatch.label)}
                size={36}
              />
            ))}
          </View>

          {/* Color picker — Additional */}
          <Text style={sectionLabel}>Additional Colors</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              paddingHorizontal: 4,
            }}
          >
            {PALETTE_ADDITIONAL.map((swatch) => (
              <ColorSwatch
                key={swatch.hex}
                hex={swatch.hex}
                label={swatch.label}
                isSelected={selectedColor === swatch.hex}
                onPress={() => handleSwatchPress(swatch.hex, swatch.label)}
                size={32}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
