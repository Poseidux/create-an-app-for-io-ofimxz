import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stopwatch } from '../types/stopwatch';

const KEY = 'stopwatches_v1';

export async function loadStopwatches(): Promise<Stopwatch[]> {
  try {
    const r = await AsyncStorage.getItem(KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

export async function saveStopwatches(items: Stopwatch[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}
