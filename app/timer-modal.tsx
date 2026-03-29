import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/Colors';
import { TimerConfig, TimerMode, getTimerConfigs, saveTimerConfig } from '@/utils/timer-storage';
import * as Haptics from 'expo-haptics';
import {
  ItemGoal,
  getGoalForItem,
  saveGoal,
  deleteGoalForItem,
} from '@/utils/goal-storage';
import { loadTimerCategories, addTimerCategory, TimerCategory } from '@/utils/timer-category-storage';

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
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

// ─── HIIT Presets ─────────────────────────────────────────────────────────────

const HIIT_PRESETS = [
  { label: 'Tabata', workMs: 20000, restMs: 10000, rounds: 8 },
  { label: 'Sprint', workMs: 30000, restMs: 15000, rounds: 6 },
  { label: 'Power',  workMs: 40000, restMs: 20000, rounds: 5 },
  { label: 'Custom', workMs: 0,     restMs: 0,     rounds: 0 },
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({
  hex, label, isSelected, onPress,
}: { hex: string; label: string; isSelected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: hex,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        borderWidth: isSelected ? 3 : 0,
        borderColor: isSelected ? '#007AFF' : 'transparent',
        boxShadow: isSelected ? `0 0 0 2px ${hex}` : '0 1px 3px rgba(0,0,0,0.15)',
      })}
    >
      {isSelected && (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffffff' }} />
      )}
    </Pressable>
  );
}

// ─── Number Input ─────────────────────────────────────────────────────────────

function NumberInput({
  label, value, onChange, min = 0, max = 999, width = 72,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; width?: number }) {
  const C = useColors();
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  const handleChange = (t: string) => {
    setText(t);
    const n = parseInt(t, 10);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
  };

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: C.inputBg,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          width,
          alignItems: 'center',
        }}
      >
        <TextInput
          value={text}
          onChangeText={handleChange}
          keyboardType="number-pad"
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: C.text,
            textAlign: 'center',
            paddingVertical: 10,
            paddingHorizontal: 8,
            width: '100%',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontVariant: ['tabular-nums'],
          }}
          maxLength={3}
        />
      </View>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function TimerModal() {
  const C = useColors();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  const [mode, setMode] = useState<TimerMode>('countdown');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#22c55e');

  // Countdown — now with days + hours
  const [cdDays, setCdDays] = useState(0);
  const [cdHours, setCdHours] = useState(0);
  const [cdMinutes, setCdMinutes] = useState(5);
  const [cdSeconds, setCdSeconds] = useState(0);

  // Interval
  const [ivWorkMin, setIvWorkMin] = useState(0);
  const [ivWorkSec, setIvWorkSec] = useState(30);
  const [ivRestMin, setIvRestMin] = useState(0);
  const [ivRestSec, setIvRestSec] = useState(15);
  const [ivRounds, setIvRounds] = useState(8);

  // HIIT
  const [hiitPreset, setHiitPreset] = useState(0);
  const [hiitWorkMin, setHiitWorkMin] = useState(0);
  const [hiitWorkSec, setHiitWorkSec] = useState(20);
  const [hiitRestMin, setHiitRestMin] = useState(0);
  const [hiitRestSec, setHiitRestSec] = useState(10);
  const [hiitRounds, setHiitRounds] = useState(8);

  // Category
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [timerCategories, setTimerCategories] = useState<TimerCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');

  // Goal state
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [existingGoal, setExistingGoal] = useState<ItemGoal | null>(null);

  // Load categories on mount
  useEffect(() => {
    loadTimerCategories().then(setTimerCategories);
  }, []);

  // Load existing config if editing
  useEffect(() => {
    if (!edit) return;
    console.log(`[TimerModal] Loading existing timer config id=${edit}`);
    getTimerConfigs().then(configs => {
      const cfg = configs.find(c => c.id === edit);
      if (!cfg) return;
      setMode(cfg.mode);
      setName(cfg.name);
      setColor(cfg.color);
      setSelectedCategoryId(cfg.category ?? 'all');
      if (cfg.mode === 'countdown' && cfg.countdownMs) {
        const totalSec = Math.floor(cfg.countdownMs / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        setCdDays(days);
        setCdHours(hours);
        setCdMinutes(mins);
        setCdSeconds(secs);
      }
      if (cfg.mode === 'interval' || cfg.mode === 'hiit') {
        const wSec = Math.floor((cfg.workMs ?? 0) / 1000);
        const rSec = Math.floor((cfg.restMs ?? 0) / 1000);
        if (cfg.mode === 'interval') {
          setIvWorkMin(Math.floor(wSec / 60)); setIvWorkSec(wSec % 60);
          setIvRestMin(Math.floor(rSec / 60)); setIvRestSec(rSec % 60);
          setIvRounds(cfg.rounds ?? 8);
        } else {
          setHiitWorkMin(Math.floor(wSec / 60)); setHiitWorkSec(wSec % 60);
          setHiitRestMin(Math.floor(rSec / 60)); setHiitRestSec(rSec % 60);
          setHiitRounds(cfg.rounds ?? 8);
          setHiitPreset(3); // Custom
        }
      }
    });
  }, [edit]);

  // Load existing goal if editing
  useEffect(() => {
    if (!edit) return;
    console.log(`[TimerModal] Loading goal for timerId=${edit}`);
    getGoalForItem(edit).then(goal => {
      if (!goal) return;
      setExistingGoal(goal);
      setGoalEnabled(true);
      setGoalName(goal.goalName ?? '');
      console.log(`[TimerModal] Existing goal loaded: type=${goal.goalType}`);
    });
  }, [edit]);

  const applyHiitPreset = (idx: number) => {
    console.log(`[TimerModal] HIIT preset selected: ${HIIT_PRESETS[idx].label}`);
    setHiitPreset(idx);
    if (idx < 3) {
      const p = HIIT_PRESETS[idx];
      setHiitWorkMin(0); setHiitWorkSec(p.workMs / 1000);
      setHiitRestMin(0); setHiitRestSec(p.restMs / 1000);
      setHiitRounds(p.rounds);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    console.log(`[TimerModal] Add category pressed: "${trimmed}"`);
    const updated = await addTimerCategory(trimmed);
    setTimerCategories(updated);
    const found = updated.find(c => c.name === trimmed && !c.isBuiltIn);
    if (found) setSelectedCategoryId(found.id);
    setNewCatName('');
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    let config: TimerConfig;
    const id = edit ?? Math.random().toString(36).slice(2);
    const category = selectedCategoryId === 'all' ? undefined : selectedCategoryId;

    if (mode === 'countdown') {
      const countdownMs = ((cdDays * 86400) + (cdHours * 3600) + (cdMinutes * 60) + cdSeconds) * 1000;
      config = { id, name: trimmed, mode, color, category, countdownMs };
    } else if (mode === 'interval') {
      const workMs = (ivWorkMin * 60 + ivWorkSec) * 1000;
      const restMs = (ivRestMin * 60 + ivRestSec) * 1000;
      config = { id, name: trimmed, mode, color, category, workMs, restMs, rounds: ivRounds };
    } else {
      const workMs = (hiitWorkMin * 60 + hiitWorkSec) * 1000;
      const restMs = (hiitRestMin * 60 + hiitRestSec) * 1000;
      config = { id, name: trimmed, mode, color, category, workMs, restMs, rounds: hiitRounds };
    }

    console.log(`[TimerModal] Saving timer config: id=${id}, name="${trimmed}", mode=${mode}, category=${category}`);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveTimerConfig(config);

    // Save or delete goal
    if (goalEnabled) {
      const goalType = mode === 'countdown' ? 'complete_countdown' : 'complete_all_rounds';
      const goal: ItemGoal = {
        id: existingGoal?.id ?? Math.random().toString(36).slice(2),
        itemId: id,
        itemName: trimmed,
        itemKind: 'timer',
        goalType,
        goalName: goalName.trim() || undefined,
        status: existingGoal?.status ?? 'active',
        createdAt: existingGoal?.createdAt ?? new Date().toISOString(),
      };
      console.log(`[TimerModal] Saving goal: type=${goalType}, itemId=${id}`);
      await saveGoal(goal);
    } else if (existingGoal) {
      console.log(`[TimerModal] Deleting goal for itemId=${id}`);
      await deleteGoalForItem(id);
    }

    router.back();
  };

  const canSave = name.trim().length > 0;
  const canAddCat = newCatName.trim().length > 0;
  const isEditing = Boolean(edit);
  const title = isEditing ? 'Edit Timer' : 'New Timer';

  const sectionLabel = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.textSecondary,
    paddingHorizontal: 4,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  const MODES: { value: TimerMode; label: string }[] = [
    { value: 'countdown', label: 'Countdown' },
    { value: 'interval', label: 'Interval' },
    { value: 'hiit', label: 'HIIT' },
  ];

  const goalTypeLabel = mode === 'countdown' ? 'Complete countdown' : 'Complete all rounds';
  const goalDescription = 'Goal achieved when the timer finishes naturally without being stopped early.';

  return (
    <View style={{ flex: 1, backgroundColor: C.card }}>
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
            onPress={() => {
              console.log('[TimerModal] Cancel pressed');
              router.back();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500' }}>Cancel</Text>
          </Pressable>

          <Text style={{ fontSize: 17, fontWeight: '600', color: C.text }}>{title}</Text>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => ({ opacity: !canSave ? 0.4 : pressed ? 0.6 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.tint, fontWeight: '600' }}>Save</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        >
          {/* Mode Segmented Control */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.surfaceSecondary,
              borderRadius: 10,
              padding: 3,
              marginBottom: 24,
            }}
          >
            {MODES.map(m => {
              const isActive = mode === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    console.log(`[TimerModal] Mode selected: ${m.value}`);
                    setMode(m.value);
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: isActive ? C.card : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10)' : undefined,
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '500', color: isActive ? C.text : C.textSecondary }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Name */}
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
              placeholder="Timer name"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              style={{ fontSize: 17, color: C.text, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, margin: 0 }}
            />
          </View>
          <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 24 }}>
            Give your timer a descriptive name.
          </Text>

          {/* Mode-specific fields */}
          {mode === 'countdown' && (
            <>
              <Text style={sectionLabel}>Duration</Text>
              <View
                style={{
                  backgroundColor: C.background,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 20,
                  marginBottom: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <NumberInput label="Days" value={cdDays} onChange={setCdDays} max={99} width={56} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>d</Text>
                <NumberInput label="Hours" value={cdHours} onChange={setCdHours} max={23} width={56} />
                <Text style={{ fontSize: 24, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
                <NumberInput label="Minutes" value={cdMinutes} onChange={setCdMinutes} max={59} width={56} />
                <Text style={{ fontSize: 24, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
                <NumberInput label="Seconds" value={cdSeconds} onChange={setCdSeconds} max={59} width={56} />
              </View>
            </>
          )}

          {mode === 'interval' && (
            <>
              <Text style={sectionLabel}>Work Time</Text>
              <View
                style={{
                  backgroundColor: C.background,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 20,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <NumberInput label="Minutes" value={ivWorkMin} onChange={setIvWorkMin} max={99} />
                <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
                <NumberInput label="Seconds" value={ivWorkSec} onChange={setIvWorkSec} max={59} />
              </View>

              <Text style={sectionLabel}>Rest Time</Text>
              <View
                style={{
                  backgroundColor: C.background,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 20,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <NumberInput label="Minutes" value={ivRestMin} onChange={setIvRestMin} max={99} />
                <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
                <NumberInput label="Seconds" value={ivRestSec} onChange={setIvRestSec} max={59} />
              </View>

              <Text style={sectionLabel}>Rounds</Text>
              <View
                style={{
                  backgroundColor: C.background,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 20,
                  marginBottom: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NumberInput label="Rounds" value={ivRounds} onChange={setIvRounds} min={1} max={99} />
              </View>
            </>
          )}

          {mode === 'hiit' && (
            <>
              <Text style={sectionLabel}>Preset</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {HIIT_PRESETS.map((p, idx) => {
                  const isActive = hiitPreset === idx;
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => applyHiitPreset(idx)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isActive ? C.primary : C.chipBackground,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#fff' : C.chipText }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {hiitPreset === 3 && (
                <>
                  <Text style={sectionLabel}>Work Time</Text>
                  <View
                    style={{
                      backgroundColor: C.background,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: C.border,
                      padding: 20,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                    }}
                  >
                    <NumberInput label="Minutes" value={hiitWorkMin} onChange={setHiitWorkMin} max={99} />
                    <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
                    <NumberInput label="Seconds" value={hiitWorkSec} onChange={setHiitWorkSec} max={59} />
                  </View>

                  <Text style={sectionLabel}>Rest Time</Text>
                  <View
                    style={{
                      backgroundColor: C.background,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: C.border,
                      padding: 20,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                    }}
                  >
                    <NumberInput label="Minutes" value={hiitRestMin} onChange={setHiitRestMin} max={99} />
                    <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16 }}>:</Text>
                    <NumberInput label="Seconds" value={hiitRestSec} onChange={setHiitRestSec} max={59} />
                  </View>
                </>
              )}

              <Text style={sectionLabel}>Rounds</Text>
              <View
                style={{
                  backgroundColor: C.background,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 20,
                  marginBottom: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NumberInput label="Rounds" value={hiitRounds} onChange={setHiitRounds} min={1} max={99} />
              </View>
            </>
          )}

          {/* Color picker */}
          <Text style={sectionLabel}>Color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4, marginBottom: 28 }}>
            {PALETTE.map(swatch => (
              <ColorSwatch
                key={swatch.hex}
                hex={swatch.hex}
                label={swatch.label}
                isSelected={color === swatch.hex}
                onPress={() => {
                  console.log(`[TimerModal] Color selected: ${swatch.label}`);
                  setColor(swatch.hex);
                }}
              />
            ))}
          </View>

          {/* Category section */}
          <Text style={sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}
            style={{ flexShrink: 0, marginBottom: 12 }}
          >
            {timerCategories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    console.log(`[TimerModal] Category chip pressed: ${cat.id}`);
                    setSelectedCategoryId(cat.id);
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
                onSubmitEditing={handleAddCategory}
                style={{ fontSize: 14, color: C.text, padding: 0, margin: 0 }}
              />
            </View>
            <Pressable
              onPress={handleAddCategory}
              disabled={!canAddCat}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: canAddCat ? C.tint : C.chipBackground,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: canAddCat ? '#fff' : C.subtext }}>
                Add
              </Text>
            </Pressable>
          </View>

          {/* Goal section */}
          <Text style={sectionLabel}>Goal</Text>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            {/* Toggle row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
                  Add Goal
                </Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                  Track completion of this timer
                </Text>
              </View>
              <Switch
                value={goalEnabled}
                onValueChange={(v) => {
                  console.log(`[TimerModal] Goal toggle: ${v}`);
                  setGoalEnabled(v);
                }}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor="#fff"
              />
            </View>

            {goalEnabled && (
              <>
                <View style={{ height: 1, backgroundColor: C.divider }} />
                <View style={{ padding: 14, gap: 10 }}>
                  {/* Goal name input */}
                  <View>
                    <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600', marginBottom: 6 }}>
                      Goal Name (optional)
                    </Text>
                    <View
                      style={{
                        backgroundColor: C.inputBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: C.border,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                      }}
                    >
                      <TextInput
                        value={goalName}
                        onChangeText={setGoalName}
                        placeholder="e.g. Complete Tabata"
                        placeholderTextColor={C.placeholder}
                        returnKeyType="done"
                        style={{ fontSize: 14, color: C.text, padding: 0, margin: 0 }}
                      />
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: `${C.primary}14`,
                      borderWidth: 1,
                      borderColor: `${C.primary}40`,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: C.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: C.primary,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>
                        {goalTypeLabel}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                        {goalDescription}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.subtext, paddingHorizontal: 4, marginBottom: 8 }}>
            Goal status is checked when the timer completes or is stopped.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
