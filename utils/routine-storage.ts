import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoutineType = 'focus' | 'break' | 'study' | 'workout' | 'custom';

export interface Routine {
  id: string;
  name: string;
  emoji: string;
  type: RoutineType;
  color: string;
  durationMinutes: number;
  description?: string;
  createdAt: string;
  lastUsedAt?: string;
  useCount: number;
}

const ROUTINES_KEY = '@chroniqo_routines';

export async function getRoutines(): Promise<Routine[]> {
  try {
    const r = await AsyncStorage.getItem(ROUTINES_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function saveRoutine(routine: Routine): Promise<void> {
  try {
    const routines = await getRoutines();
    const idx = routines.findIndex(r => r.id === routine.id);
    if (idx >= 0) routines[idx] = routine;
    else routines.unshift(routine);
    await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  } catch {}
}

export async function deleteRoutine(id: string): Promise<void> {
  try {
    const routines = await getRoutines();
    await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines.filter(r => r.id !== id)));
  } catch {}
}

export async function markRoutineUsed(id: string): Promise<void> {
  try {
    const routines = await getRoutines();
    const idx = routines.findIndex(r => r.id === id);
    if (idx >= 0) {
      routines[idx] = {
        ...routines[idx],
        lastUsedAt: new Date().toISOString(),
        useCount: (routines[idx].useCount ?? 0) + 1,
      };
      await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
    }
  } catch {}
}
