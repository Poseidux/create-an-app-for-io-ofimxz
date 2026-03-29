import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_CATEGORIES_KEY = '@chroniqo_timer_categories';

export interface TimerCategory {
  id: string;
  name: string;
  isBuiltIn?: boolean;
}

export const BUILT_IN_TIMER_CATEGORIES: TimerCategory[] = [
  { id: 'all', name: 'All', isBuiltIn: true },
  { id: 'fitness', name: 'Fitness', isBuiltIn: true },
  { id: 'work', name: 'Work', isBuiltIn: true },
];

export async function loadTimerCategories(): Promise<TimerCategory[]> {
  try {
    const raw = await AsyncStorage.getItem(TIMER_CATEGORIES_KEY);
    const custom: TimerCategory[] = raw ? JSON.parse(raw) : [];
    return [...BUILT_IN_TIMER_CATEGORIES, ...custom];
  } catch {
    return [...BUILT_IN_TIMER_CATEGORIES];
  }
}

export async function addTimerCategory(name: string): Promise<TimerCategory[]> {
  const trimmed = name.trim();
  const id = `tcat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newCat: TimerCategory = { id, name: trimmed };
  const all = await loadTimerCategories();
  const custom = all.filter(c => !c.isBuiltIn);
  const updated = [...custom, newCat];
  await AsyncStorage.setItem(TIMER_CATEGORIES_KEY, JSON.stringify(updated));
  return [...BUILT_IN_TIMER_CATEGORIES, ...updated];
}
