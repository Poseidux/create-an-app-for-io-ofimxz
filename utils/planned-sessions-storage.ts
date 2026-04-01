import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlannedItemType = 'stopwatch' | 'timer' | 'routine';
export type PlannedItemStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export interface PlannedSession {
  id: string;
  date: string;                // YYYY-MM-DD local date this is planned for
  itemType: PlannedItemType;
  itemId: string;              // id of the stopwatch/timer/routine
  itemName: string;
  itemColor: string;
  itemEmoji?: string;          // for routines
  scheduledTime?: string;      // optional HH:MM e.g. "09:30"
  durationMinutes?: number;    // optional target duration hint
  status: PlannedItemStatus;
  completedSessionId?: string; // set when done, links to saved session
  note?: string;
  createdAt: string;           // ISO
}

const KEY = '@chroniqo_planned_sessions';

export async function getPlannedSessions(): Promise<PlannedSession[]> {
  try {
    const r = await AsyncStorage.getItem(KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function savePlannedSession(item: PlannedSession): Promise<void> {
  try {
    const all = await getPlannedSessions();
    const idx = all.findIndex(p => p.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.unshift(item);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export async function deletePlannedSession(id: string): Promise<void> {
  try {
    const all = await getPlannedSessions();
    await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(p => p.id !== id)));
  } catch {}
}

export async function getPlannedSessionsForDate(date: string): Promise<PlannedSession[]> {
  const all = await getPlannedSessions();
  return all.filter(p => p.date === date);
}

export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
