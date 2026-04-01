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

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ['🎯', '🧠', '📚', '💪', '🧘', '☕', '🎵', '✨'];
const COLOR_OPTIONS = ['#22c55e', '#38bdf8', '#fb923c', '#f87171', '#a78bfa', '#2dd4bf', '#fbbf24', '#f472b6'];
const DURATION_OPTIONS = [5, 10, 15, 25, 30, 45, 60, 90];
const TYPE_OPTIONS: { key: RoutineType; label: string }[] = [
  { key: 'focus', label: 'Focus' },
  { key: 'break', label: 'Break' },
  { key: 'study', label: 'Study' },
  { key: 'workout', label: 'Workout' },
  { key: 'custom', label: 'Custom' },
];

const TYPE_DEFAULTS: Record<RoutineType, { emoji: string; color: string }> = {
  focus:   { emoji: '🎯', color: '#0A84FF' },
  break:   { emoji: '☕', color: '#2dd4bf' },
  study:   { emoji: '📚', color: '#a78bfa' },
  workout: { emoji: '💪', color: '#f87171' },
  custom:  { emoji: '✨', color: '#fbbf24' },
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title, C }: { title: string; C: ReturnType<typeof useColors> }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: C.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
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
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#0A84FF');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [description, setDescription] = useState('');

  // Load existing routine if editing
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
    // Only apply defaults if user hasn't customised emoji/color yet
    if (!existing) {
      setEmoji(TYPE_DEFAULTS[t].emoji);
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

    // Paywall guard for new routines
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
      {/* ── Header — outside KeyboardAvoidingView so it's never pushed off-screen ── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Pressable
          onPress={() => {
            console.log('[RoutineModal] Close pressed');
            router.back();
          }}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <X size={18} color={C.text} />
        </Pressable>

        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: C.text,
          }}
        >
          {titleText}
        </Text>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Check size={18} color="#fff" />
        </Pressable>
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
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* ── Name ── */}
        <View style={{ marginBottom: 24 }}>
          <SectionLabel title="Name" C={C} />
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
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
              }}
            />
          </View>
        </View>

        {/* ── Type ── */}
        <View style={{ marginBottom: 24 }}>
          <SectionLabel title="Type" C={C} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {TYPE_OPTIONS.map(opt => {
              const isSelected = type === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => handleTypeSelect(opt.key)}
                  style={({ pressed }) => ({
                    backgroundColor: isSelected ? C.chipSelected : C.chipBackground,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isSelected ? C.chipSelectedText : C.chipText,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Icon ── */}
        <View style={{ marginBottom: 24 }}>
          <SectionLabel title="Icon" C={C} />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {/* No icon option */}
            <Pressable
              onPress={() => {
                console.log('[RoutineModal] No icon selected');
                setEmoji('');
              }}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: C.card,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: emoji === '' ? 2 : 1,
                borderColor: emoji === '' ? C.primary : C.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>None</Text>
            </Pressable>
            {EMOJI_OPTIONS.map(e => {
              const isSelected = emoji === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => {
                    console.log(`[RoutineModal] Emoji selected: ${e}`);
                    setEmoji(e);
                  }}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: C.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? C.primary : C.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Duration ── */}
        <View style={{ marginBottom: 24 }}>
          <SectionLabel title="Duration" C={C} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {DURATION_OPTIONS.map(d => {
              const isSelected = durationMinutes === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    console.log(`[RoutineModal] Duration selected: ${d}m`);
                    setDurationMinutes(d);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: isSelected ? C.chipSelected : C.chipBackground,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isSelected ? C.chipSelectedText : C.chipText,
                    }}
                  >
                    {d}
                    m
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Description ── */}
        <View style={{ marginBottom: 24 }}>
          <SectionLabel title="Description" C={C} />
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
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
                maxHeight: 60,
              }}
            />
          </View>
        </View>

        {/* ── Color ── */}
        <View style={{ marginBottom: 32 }}>
          <SectionLabel title="Color" C={C} />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(c => {
              const isSelected = color === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    console.log(`[RoutineModal] Color selected: ${c}`);
                    setColor(c);
                  }}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: c,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: C.text,
                    opacity: pressed ? 0.7 : 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                />
              );
            })}
          </View>
        </View>

        {/* ── Delete (edit mode only) ── */}
        {isEditing && (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => ({
              backgroundColor: 'rgba(255,69,58,0.12)',
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.destructive }}>
              Delete Routine
            </Text>
          </Pressable>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
