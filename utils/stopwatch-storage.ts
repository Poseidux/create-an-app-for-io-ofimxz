import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stopwatch, Lap } from '../types/stopwatch';

const KEY = 'stopwatches_v1';

export async function loadStopwatches(): Promise<Stopwatch[]> {
  try {
    const r = await AsyncStorage.getItem(KEY);
    if (!r) return [];
    const items: Stopwatch[] = JSON.parse(r);
    // Migrate: ensure laps field exists on all items
    return items.map(sw => ({ laps: [], ...sw }));
  } catch {
    return [];
  }
}

export async function saveStopwatches(items: Stopwatch[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

export async function saveLap(stopwatchId: string, lap: Lap): Promise<void> {
  try {
    console.log(`[stopwatch-storage] saveLap: stopwatchId=${stopwatchId}, lapNumber=${lap.lapNumber}`);
    const items = await loadStopwatches();
    const updated = items.map(sw => {
      if (sw.id !== stopwatchId) return sw;
      const laps = [...(sw.laps ?? []), lap];
      return { ...sw, laps };
    });
    await saveStopwatches(updated);
  } catch (e) {
    console.error('[stopwatch-storage] saveLap error:', e);
  }
}

export async function clearLaps(stopwatchId: string): Promise<void> {
  try {
    console.log(`[stopwatch-storage] clearLaps: stopwatchId=${stopwatchId}`);
    const items = await loadStopwatches();
    const updated = items.map(sw =>
      sw.id === stopwatchId ? { ...sw, laps: [] } : sw
    );
    await saveStopwatches(updated);
  } catch (e) {
    console.error('[stopwatch-storage] clearLaps error:', e);
  }
}

export async function updateStopwatchNote(stopwatchId: string, note: string): Promise<void> {
  try {
    console.log(`[stopwatch-storage] updateStopwatchNote: stopwatchId=${stopwatchId}`);
    const items = await loadStopwatches();
    const updated = items.map(sw =>
      sw.id === stopwatchId ? { ...sw, note } : sw
    );
    await saveStopwatches(updated);
  } catch (e) {
    console.error('[stopwatch-storage] updateStopwatchNote error:', e);
  }
}
