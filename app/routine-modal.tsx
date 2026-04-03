import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import {
  Routine,
  RoutineType,
  getRoutines,
  saveRoutine,
  deleteRoutine,
} from '@/utils/routine-storage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_OPTIONS = ['#22c55e', '#38bdf8', '#fb923c', '#f87171', '#a78bfa', '#2dd4bf', '#fbbf24', '#f472b6'];
const DURATION_OPTIONS = [5, 10, 15, 25, 30, 45, 60, 90];
const TYPE_OPTIONS: { key: RoutineType; label: string }[] = [
  { key: 'focus', label: 'Focus' },
  { key: 'break', label: 'Break' },
  { key: 'study', label: 'Study' },
  { key: 'workout', label: 'Workout' },
  { key: 'custom', label: 'Custom' },
];

const TYPE_DEFAULTS: Record<RoutineType, { color: string }> = {
  focus:   { color: '#0A84FF' },
  break:   { color: '#2dd4bf' },
  study:   { color: '#a78bfa' },
  workout: { color: '#f87171' },
  custom:  { color: '#fbbf24' },
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title, C }: { title: string; C: ReturnType<typeof useColors> }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: C.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 10,
        lineHeight: 17,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoutineModal() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isSubscribed } = useSubscription();

  const isEditing = Boolean(id);

  const [existing, setExisting] = useState<Routine | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<RoutineType>('focus');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState('#0A84FF');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!id) return;
    console.log(`[RoutineModal] Loading routine for edit: ${id}`);
    getRoutines().then(routines => {
      const found = routines.find(r => r.id === id) ?? null;
      if (found) {
        setExisting(found);
        setName(found.name);
        setType(found.type);
        setEmoji(found.emoji);
        setColor(found.color);
        setDurationMinutes(found.durationMinutes);
        setDescription(found.description ?? '');
      }
    });
  }, [id]);

  const handleTypeSelect = (t: RoutineType) => {
    console.log(`[RoutineModal] Type selected: ${t}`);
    setType(t);
    if (!existing) {
      setColor(TYPE_DEFAULTS[t].color);
    }
  };

  const handleSave = async () => {
    console.log(`[RoutineModal] Save pressed — name="${name}", type=${type}, duration=${durationMinutes}m`);
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a name for this routine.');
      return;
    }

    if (!isEditing) {
      const existingRoutines = await getRoutines();
      if (!isSubscribed && existingRoutines.length >= 3) {
        console.log('[RoutineModal] Routine limit reached, redirecting to paywall');
        router.push('/paywall');
        return;
      }
    }
    const routine: Routine = {
      id: existing?.id ?? generateId(),
      name: trimmedName,
      emoji,
      type,
      color,
      durationMinutes,
      description: description.trim() || undefined,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastUsedAt: existing?.lastUsedAt,
      useCount: existing?.useCount ?? 0,
    };
    await saveRoutine(routine);
    console.log(`[RoutineModal] Routine saved: ${routine.id}`);
    router.back();
  };

  const handleDelete = () => {
    console.log(`[RoutineModal] Delete pressed for routine: ${id}`);
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteRoutine(id);
              console.log(`[RoutineModal] Routine deleted: ${id}`);
            }
            router.back();
          },
        },
      ]
    );
  };

  const titleText = isEditing ? 'Edit Routine' : 'New Routine';

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: C.divider,
          backgroundColor: C.background,
        }}
      >
        <AnimatedPressable
          onPress={() => {
            console.log('[RoutineModal] Close pressed');
            router.back();
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          scaleValue={0.88}
        >
          <X size={18} color={C.text} />
        </AnimatedPressable>

        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: C.text,
            letterSpacing: -0.3,
            lineHeight: 22,
          }}
        >
          {titleText}
        </Text>

        <AnimatedPressable
          onPress={handleSave}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
          scaleValue={0.88}
        >
          <Check size={18} color="#fff" />
        </AnimatedPressable>
      </View>

      {/* ── Keyboard-aware scroll area ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 40,
          }}
        >
          {/* ── Name ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Name" C={C} />
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Deep Focus"
                placeholderTextColor={C.placeholder}
                style={{
                  fontSize: 16,
                  color: C.text,
                  padding: 0,
                  lineHeight: 23,
                }}
              />
            </View>
          </View>

          {/* ── Type ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Type" C={C} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {TYPE_OPTIONS.map(opt => {
                const isSelected = type === opt.key;
                return (
                  <AnimatedPressable
                    key={opt.key}
                    onPress={() => handleTypeSelect(opt.key)}
                    style={{
                      backgroundColor: isSelected ? C.chipSelected : C.chipBackground,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isSelected ? C.chipSelectedText : C.chipText,
                        lineHeight: 20,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Accent color ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Accent" C={C} />
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => {
                const isSelected = color === c;
                return (
                  <AnimatedPressable
                    key={c}
                    onPress={() => {
                      console.log(`[RoutineModal] Accent color selected: ${c}`);
                      setColor(c);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: c,
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isSelected
                        ? `0 0 0 3px ${C.background}, 0 0 0 5px ${c}`
                        : '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                    scaleValue={0.88}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#fff',
                        }}
                      />
                    )}
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* ── Duration ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Duration" C={C} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {DURATION_OPTIONS.map(d => {
                const isSelected = durationMinutes === d;
                const dLabel = `${d}m`;
                return (
                  <AnimatedPressable
                    key={d}
                    onPress={() => {
                      console.log(`[RoutineModal] Duration selected: ${d}m`);
                      setDurationMinutes(d);
                    }}
                    style={{
                      backgroundColor: isSelected ? C.chipSelected : C.chipBackground,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isSelected ? C.chipSelectedText : C.chipText,
                        lineHeight: 20,
                      }}
                    >
                      {dLabel}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Description ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionLabel title="Description" C={C} />
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Short description (optional)"
                placeholderTextColor={C.placeholder}
                multiline
                numberOfLines={2}
                style={{
                  fontSize: 15,
                  color: C.text,
                  padding: 0,
                  maxHeight: 64,
                  lineHeight: 22,
                }}
              />
            </View>
          </View>

          {/* ── Delete (edit mode only) ── */}
          {isEditing && (
            <AnimatedPressable
              onPress={handleDelete}
              style={{
                backgroundColor: C.dangerMuted,
                borderRadius: 14,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.danger, lineHeight: 22 }}>
                Delete Routine
              </Text>
            </AnimatedPressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
