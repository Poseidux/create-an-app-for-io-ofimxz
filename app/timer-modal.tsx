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
import { useSubscription } from '@/contexts/SubscriptionContext';
import { notifyTimerComplete } from '@/utils/completion-notifications';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: hex,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isSelected ? 3 : 0,
        borderColor: isSelected ? '#007AFF' : 'transparent',
        boxShadow: isSelected ? `0 0 0 2px ${hex}` : '0 1px 3px rgba(0,0,0,0.15)',
      }}
      scaleValue={0.88}
    >
      {isSelected && (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffffff' }} />
      )}
    </AnimatedPressable>
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
      <Text style={{ fontSize: 11, color: C.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 15 }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: C.surfaceSecondary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
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
  const { isSubscribed } = useSubscription();

  const [mode, setMode] = useState<TimerMode>('countdown');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#22c55e');

  const [cdDays, setCdDays] = useState(0);
  const [cdHours, setCdHours] = useState(0);
  const [cdMinutes, setCdMinutes] = useState(5);
  const [cdSeconds, setCdSeconds] = useState(0);

  const [ivWorkMin, setIvWorkMin] = useState(0);
  const [ivWorkSec, setIvWorkSec] = useState(30);
  const [ivRestMin, setIvRestMin] = useState(0);
  const [ivRestSec, setIvRestSec] = useState(15);
  const [ivRounds, setIvRounds] = useState(8);

  const [hiitPreset, setHiitPreset] = useState(0);
  const [hiitWorkMin, setHiitWorkMin] = useState(0);
  const [hiitWorkSec, setHiitWorkSec] = useState(20);
  const [hiitRestMin, setHiitRestMin] = useState(0);
  const [hiitRestSec, setHiitRestSec] = useState(10);
  const [hiitRounds, setHiitRounds] = useState(8);

  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [timerCategories, setTimerCategories] = useState<TimerCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');

  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [existingGoal, setExistingGoal] = useState<ItemGoal | null>(null);

  useEffect(() => {
    loadTimerCategories().then(setTimerCategories);
  }, []);

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
          setHiitPreset(3);
        }
      }
    });
  }, [edit]);

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

    if (!edit) {
      const existingConfigs = await getTimerConfigs();
      if (!isSubscribed && existingConfigs.length >= 3) {
        console.log('[TimerModal] Timer limit reached, redirecting to paywall');
        router.push('/paywall');
        return;
      }
    }

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
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textTertiary,
    paddingHorizontal: 4,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 2.0,
    lineHeight: 17,
  };

  const MODES: { value: TimerMode; label: string }[] = [
    { value: 'countdown', label: 'Countdown' },
    { value: 'interval', label: 'Interval' },
    { value: 'hiit', label: 'HIIT' },
  ];

  const goalTypeLabel = mode === 'countdown' ? 'Complete countdown' : 'Complete all rounds';
  const goalDescription = 'Goal achieved when the timer finishes naturally without being stopped early.';

  const durationCardStyle = {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.divider,
          }}
        >
          <Pressable
            onPress={() => {
              console.log('[TimerModal] Cancel pressed');
              router.back();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '500', lineHeight: 22 }}>
              Cancel
            </Text>
          </Pressable>

          <Text style={{ fontSize: 17, fontWeight: '600', color: C.text, letterSpacing: -0.3, lineHeight: 22 }}>
            {title}
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => ({ opacity: !canSave ? 0.4 : pressed ? 0.6 : 1, padding: 4 })}
          >
            <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600', lineHeight: 22 }}>
              Save
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        >
          {/* Mode Segmented Control */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.surfaceSecondary,
              borderRadius: 12,
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
                    paddingVertical: 9,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: isActive ? C.surface : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? C.border : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                    boxShadow: isActive ? '0 0 8px rgba(0,212,255,0.15)' : undefined,
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '500', color: isActive ? C.text : C.textSecondary, lineHeight: 18 }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Name */}
          <View
            style={{
              backgroundColor: C.surfaceSecondary,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 8,
              boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
            }}
          >
            <TextInput
              autoFocus={!isEditing}
              value={name}
              onChangeText={setName}
              placeholder="Timer name"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
              style={{ fontSize: 17, color: C.text, paddingHorizontal: 4, paddingVertical: 4, minHeight: 44, margin: 0, lineHeight: 24 }}
            />
          </View>
          <Text style={{ fontSize: 13, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28, lineHeight: 19 }}>
            Give your timer a descriptive name.
          </Text>

          {/* Mode-specific fields */}
          {mode === 'countdown' && (
            <>
              <Text style={sectionLabel}>Duration</Text>
              <View
                style={{
                  ...durationCardStyle,
                  padding: 20,
                  marginBottom: 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <NumberInput label="Days" value={cdDays} onChange={setCdDays} max={99} width={56} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 22 }}>d</Text>
                <NumberInput label="Hours" value={cdHours} onChange={setCdHours} max={23} width={56} />
                <Text style={{ fontSize: 24, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 30 }}>:</Text>
                <NumberInput label="Minutes" value={cdMinutes} onChange={setCdMinutes} max={59} width={56} />
                <Text style={{ fontSize: 24, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 30 }}>:</Text>
                <NumberInput label="Seconds" value={cdSeconds} onChange={setCdSeconds} max={59} width={56} />
              </View>
            </>
          )}

          {mode === 'interval' && (
            <>
              <Text style={sectionLabel}>Work Time</Text>
              <View
                style={{
                  ...durationCardStyle,
                  padding: 20,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <NumberInput label="Minutes" value={ivWorkMin} onChange={setIvWorkMin} max={99} />
                <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 34 }}>:</Text>
                <NumberInput label="Seconds" value={ivWorkSec} onChange={setIvWorkSec} max={59} />
              </View>

              <Text style={sectionLabel}>Rest Time</Text>
              <View
                style={{
                  ...durationCardStyle,
                  padding: 20,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <NumberInput label="Minutes" value={ivRestMin} onChange={setIvRestMin} max={99} />
                <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 34 }}>:</Text>
                <NumberInput label="Seconds" value={ivRestSec} onChange={setIvRestSec} max={59} />
              </View>

              <Text style={sectionLabel}>Rounds</Text>
              <View
                style={{
                  ...durationCardStyle,
                  padding: 20,
                  marginBottom: 28,
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
                    <AnimatedPressable
                      key={p.label}
                      onPress={() => applyHiitPreset(idx)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 20,
                        backgroundColor: isActive ? C.primary : C.surfaceSecondary,
                        borderWidth: isActive ? 0 : 1,
                        borderColor: C.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#0D0F14' : C.chipText, lineHeight: 18 }}>
                        {p.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {hiitPreset === 3 && (
                <>
                  <Text style={sectionLabel}>Work Time</Text>
                  <View
                    style={{
                      ...durationCardStyle,
                      padding: 20,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                    }}
                  >
                    <NumberInput label="Minutes" value={hiitWorkMin} onChange={setHiitWorkMin} max={99} />
                    <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 34 }}>:</Text>
                    <NumberInput label="Seconds" value={hiitWorkSec} onChange={setHiitWorkSec} max={59} />
                  </View>

                  <Text style={sectionLabel}>Rest Time</Text>
                  <View
                    style={{
                      ...durationCardStyle,
                      padding: 20,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                    }}
                  >
                    <NumberInput label="Minutes" value={hiitRestMin} onChange={setHiitRestMin} max={99} />
                    <Text style={{ fontSize: 28, fontWeight: '700', color: C.textSecondary, marginTop: 16, lineHeight: 34 }}>:</Text>
                    <NumberInput label="Seconds" value={hiitRestSec} onChange={setHiitRestSec} max={59} />
                  </View>
                </>
              )}

              <Text style={sectionLabel}>Rounds</Text>
              <View
                style={{
                  ...durationCardStyle,
                  padding: 20,
                  marginBottom: 28,
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
                <AnimatedPressable
                  key={cat.id}
                  onPress={() => {
                    console.log(`[TimerModal] Category chip pressed: ${cat.id}`);
                    setSelectedCategoryId(cat.id);
                  }}
                  style={{
                    flexShrink: 0,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isSelected ? C.primary : C.surfaceSecondary,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: C.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isSelected ? '#0D0F14' : C.chipText, lineHeight: 20 }}>
                    {cat.name}
                  </Text>
                </AnimatedPressable>
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
                backgroundColor: C.surfaceSecondary,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
              }}
            >
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="New category..."
                placeholderTextColor={C.placeholder}
                returnKeyType="done"
                onSubmitEditing={handleAddCategory}
                style={{ fontSize: 14, color: C.text, padding: 0, margin: 0, lineHeight: 20 }}
              />
            </View>
            <AnimatedPressable
              onPress={handleAddCategory}
              disabled={!canAddCat}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: canAddCat ? C.primary : C.surfaceSecondary,
                opacity: canAddCat ? 1 : 0.5,
                boxShadow: canAddCat ? '0 0 20px rgba(0,212,255,0.35)' : undefined,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: canAddCat ? '#0D0F14' : C.textSecondary, lineHeight: 20 }}>
                Add
              </Text>
            </AnimatedPressable>
          </View>

          {/* Goal section */}
          <Text style={sectionLabel}>Goal</Text>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              marginBottom: 8,
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {/* Toggle row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                minHeight: 52,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 21 }}>
                  Add Goal
                </Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
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
                <View style={{ padding: 14, gap: 12 }}>
                  {/* Goal name input */}
                  <View>
                    <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600', marginBottom: 8, lineHeight: 17 }}>
                      Goal Name (optional)
                    </Text>
                    <View
                      style={{
                        backgroundColor: C.surfaceSecondary,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: C.border,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset',
                      }}
                    >
                      <TextInput
                        value={goalName}
                        onChangeText={setGoalName}
                        placeholder="e.g. Complete Tabata"
                        placeholderTextColor={C.placeholder}
                        returnKeyType="done"
                        style={{ fontSize: 14, color: C.text, padding: 0, margin: 0, lineHeight: 20 }}
                      />
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 12,
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
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary, lineHeight: 20 }}>
                        {goalTypeLabel}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
                        {goalDescription}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 8, lineHeight: 17 }}>
            Goal status is checked when the timer completes or is stopped.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
