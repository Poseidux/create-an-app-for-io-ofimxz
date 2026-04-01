import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { loadStopwatches } from '@/utils/stopwatch-storage';
import { getTimerConfigs, TimerConfig } from '@/utils/timer-storage';
import { getRoutines, Routine } from '@/utils/routine-storage';
import {
  PlannedItemType,
  PlannedSession,
  savePlannedSession,
  todayDateString,
} from '@/utils/planned-sessions-storage';
import { Stopwatch } from '@/types/stopwatch';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(date: string): string {
  const today = todayDateString();
  const tomorrow = tomorrowDateString();
  if (date === today) return 'Today';
  if (date === tomorrow) return 'Tomorrow';
  return date;
}

type TabType = PlannedItemType;

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function PlanSessionModal() {
  const C = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    date?: string;
    itemType?: string;
    itemId?: string;
  }>();

  const today = todayDateString();
  const tomorrow = tomorrowDateString();

  // ── State ──
  const [selectedDate, setSelectedDate] = useState<string>(params.date ?? today);
  const [customDateInput, setCustomDateInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(
    (params.itemType as TabType) ?? 'stopwatch'
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    params.itemId ?? null
  );
  const [scheduledTime, setScheduledTime] = useState('');

  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [timers, setTimers] = useState<TimerConfig[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);

  // ── Load data ──
  useEffect(() => {
    console.log('[PlanSessionModal] Loading stopwatches, timers, routines');
    Promise.all([loadStopwatches(), getTimerConfigs(), getRoutines()]).then(
      ([sws, tms, rts]) => {
        console.log(
          `[PlanSessionModal] Loaded: ${sws.length} stopwatches, ${tms.length} timers, ${rts.length} routines`
        );
        setStopwatches(sws);
        setTimers(tms);
        setRoutines(rts);
      }
    );
  }, []);

  // ── Date cycling ──
  const handleDatePress = useCallback(() => {
    console.log('[PlanSessionModal] Date selector pressed, current:', selectedDate);
    if (selectedDate === today) {
      setSelectedDate(tomorrow);
      setShowCustomInput(false);
    } else if (selectedDate === tomorrow) {
      setShowCustomInput(true);
      setCustomDateInput('');
    } else {
      setSelectedDate(today);
      setShowCustomInput(false);
    }
  }, [selectedDate, today, tomorrow]);

  const handleCustomDateSubmit = useCallback(() => {
    const trimmed = customDateInput.trim();
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (!valid) {
      Alert.alert('Invalid date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }
    console.log('[PlanSessionModal] Custom date set:', trimmed);
    setSelectedDate(trimmed);
    setShowCustomInput(false);
  }, [customDateInput]);

  // ── Derived: current items list ──
  const currentItems: Array<{ id: string; name: string; color: string; emoji?: string }> =
    activeTab === 'stopwatch'
      ? stopwatches.map(sw => ({ id: sw.id, name: sw.name, color: sw.color ?? '#22c55e' }))
      : activeTab === 'timer'
      ? timers.map(t => ({ id: t.id, name: t.name, color: t.color ?? '#fb923c' }))
      : routines.map(r => ({ id: r.id, name: r.name, color: r.color, emoji: r.emoji }));

  const selectedItem = currentItems.find(i => i.id === selectedItemId) ?? null;

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!selectedItem) {
      Alert.alert('No item selected', 'Please select a stopwatch, timer, or routine to plan.');
      return;
    }
    const timeVal = scheduledTime.trim();
    const validTime = timeVal === '' || /^\d{1,2}:\d{2}$/.test(timeVal);
    if (!validTime) {
      Alert.alert('Invalid time', 'Please enter time as HH:MM (e.g. 09:30) or leave blank.');
      return;
    }

    const planned: PlannedSession = {
      id: Math.random().toString(36).slice(2),
      date: selectedDate,
      itemType: activeTab,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      itemColor: selectedItem.color,
      itemEmoji: selectedItem.emoji,
      scheduledTime: timeVal !== '' ? timeVal : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log(
      `[PlanSessionModal] Saving planned session: id=${planned.id}, date=${planned.date}, item="${planned.itemName}", type=${planned.itemType}`
    );
    await savePlannedSession(planned);
    router.back();
  }, [selectedItem, selectedDate, activeTab, scheduledTime, router]);

  const dateLabel = formatDateLabel(selectedDate);
  const saveLabel = `Add to ${dateLabel}`;

  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'stopwatch', label: 'Stopwatch' },
    { key: 'timer', label: 'Timer' },
    { key: 'routine', label: 'Routine' },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: C.text }}>
          Plan a Session
        </Text>
        <Pressable
          onPress={() => {
            console.log('[PlanSessionModal] Close pressed');
            router.back();
          }}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <X size={16} color={C.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Date Selector ── */}
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
          Date
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Pressable
            onPress={handleDatePress}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.primary,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.primary }}>
              {dateLabel}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: C.subtext }}>Tap to change</Text>
        </View>

        {showCustomInput && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, marginTop: -12 }}>
            <TextInput
              value={customDateInput}
              onChangeText={setCustomDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.placeholder}
              keyboardType="numbers-and-punctuation"
              style={{
                flex: 1,
                backgroundColor: C.inputBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
                color: C.text,
              }}
            />
            <Pressable
              onPress={handleCustomDateSubmit}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: C.primary,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Set</Text>
            </Pressable>
          </View>
        )}

        {/* ── Type Tabs ── */}
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
          Type
        </Text>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.surfaceSecondary,
            borderRadius: 12,
            padding: 3,
            marginBottom: 20,
          }}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  console.log(`[PlanSessionModal] Tab selected: ${tab.key}`);
                  setActiveTab(tab.key);
                  setSelectedItemId(null);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isActive ? C.card : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                  shadowColor: isActive ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 2 : 0,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? C.text : C.subtext,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Item List ── */}
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
          Select
        </Text>

        {currentItems.length === 0 ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 24,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 14, color: C.subtext, textAlign: 'center' }}>
              {activeTab === 'stopwatch'
                ? 'No stopwatches yet. Create one in the Sessions tab.'
                : activeTab === 'timer'
                ? 'No timers yet. Create one in the Sessions tab.'
                : 'No routines yet. Create one in the Today tab.'}
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            {currentItems.map((item, idx) => {
              const isSelected = selectedItemId === item.id;
              const isLast = idx === currentItems.length - 1;
              return (
                <View key={item.id}>
                  <Pressable
                    onPress={() => {
                      console.log(`[PlanSessionModal] Item selected: id=${item.id}, name="${item.name}"`);
                      setSelectedItemId(item.id);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      backgroundColor: isSelected ? C.primaryMuted : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: item.color,
                        marginRight: 12,
                      }}
                    />
                    {item.emoji != null && (
                      <Text style={{ fontSize: 16, marginRight: 8 }}>{item.emoji}</Text>
                    )}
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? C.primary : C.text,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Check size={16} color={C.primary} />}
                  </Pressable>
                  {!isLast && (
                    <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 36 }} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Optional Time ── */}
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
          Time (optional)
        </Text>
        <TextInput
          value={scheduledTime}
          onChangeText={setScheduledTime}
          placeholder="HH:MM e.g. 09:30"
          placeholderTextColor={C.placeholder}
          keyboardType="numbers-and-punctuation"
          style={{
            backgroundColor: C.inputBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: C.text,
            marginBottom: 28,
          }}
        />

        {/* ── Save Button ── */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({
            backgroundColor: selectedItem ? C.primary : C.surfaceSecondary,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: selectedItem ? '#fff' : C.subtext,
            }}
          >
            {saveLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
