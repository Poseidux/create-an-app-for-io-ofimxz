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
import { AnimatedPressable } from '@/components/AnimatedPressable';

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

  const currentItems: Array<{ id: string; name: string; color: string; emoji?: string }> =
    activeTab === 'stopwatch'
      ? stopwatches.map(sw => ({ id: sw.id, name: sw.name, color: sw.color ?? '#22c55e' }))
      : activeTab === 'timer'
      ? timers.map(t => ({ id: t.id, name: t.name, color: t.color ?? '#fb923c' }))
      : routines.map(r => ({ id: r.id, name: r.name, color: r.color, emoji: r.emoji }));

  const selectedItem = currentItems.find(i => i.id === selectedItemId) ?? null;

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

  const sectionLabel = {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 10,
    lineHeight: 17,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: C.divider,
          backgroundColor: C.background,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: '700',
            color: C.text,
            letterSpacing: -0.4,
            lineHeight: 26,
          }}
        >
          Plan a Session
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[PlanSessionModal] Close pressed');
            router.back();
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          scaleValue={0.88}
        >
          <X size={16} color={C.textSecondary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Date Selector ── */}
        <Text style={sectionLabel}>Date</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <AnimatedPressable
            onPress={handleDatePress}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: 12,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.primary,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.primary, lineHeight: 21 }}>
              {dateLabel}
            </Text>
          </AnimatedPressable>
          <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 18 }}>
            Tap to change
          </Text>
        </View>

        {showCustomInput && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, marginTop: -12 }}>
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
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: C.text,
                lineHeight: 21,
              }}
            />
            <AnimatedPressable
              onPress={handleCustomDateSubmit}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: C.primary,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 20 }}>
                Set
              </Text>
            </AnimatedPressable>
          </View>
        )}

        {/* ── Type Tabs ── */}
        <Text style={sectionLabel}>Type</Text>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.surfaceSecondary,
            borderRadius: 12,
            padding: 3,
            marginBottom: 24,
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
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isActive ? C.surface : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? C.text : C.textSecondary,
                    lineHeight: 18,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Item List ── */}
        <Text style={sectionLabel}>Select</Text>

        {currentItems.length === 0 ? (
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              padding: 28,
              alignItems: 'center',
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
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
              backgroundColor: C.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            {currentItems.map((item, idx) => {
              const isSelected = selectedItemId === item.id;
              const isLast = idx === currentItems.length - 1;
              return (
                <View key={item.id}>
                  <AnimatedPressable
                    onPress={() => {
                      console.log(`[PlanSessionModal] Item selected: id=${item.id}, name="${item.name}"`);
                      setSelectedItemId(item.id);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 15,
                      minHeight: 52,
                      backgroundColor: isSelected ? C.primaryMuted : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: item.color,
                        marginRight: 14,
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
                        lineHeight: 21,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Check size={16} color={C.primary} />}
                  </AnimatedPressable>
                  {!isLast && (
                    <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 40 }} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Optional Time ── */}
        <Text style={sectionLabel}>Time (optional)</Text>
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
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: C.text,
            marginBottom: 32,
            lineHeight: 21,
          }}
        />

        {/* ── Save Button ── */}
        <AnimatedPressable
          onPress={handleSave}
          style={{
            backgroundColor: selectedItem ? C.primary : C.surfaceSecondary,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: selectedItem ? '0 1px 3px rgba(0,0,0,0.10)' : undefined,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: selectedItem ? '#fff' : C.textSecondary,
              lineHeight: 22,
            }}
          >
            {saveLabel}
          </Text>
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
