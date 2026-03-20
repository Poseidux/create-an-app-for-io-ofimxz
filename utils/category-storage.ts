import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_CATEGORIES_KEY = 'app_custom_categories_v1';

export interface Category {
  id: string;
  name: string;
  isBuiltIn?: boolean;
}

export const BUILT_IN_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', isBuiltIn: true },
  { id: 'home', name: 'Home', isBuiltIn: true },
  { id: 'work', name: 'Work', isBuiltIn: true },
];

export async function loadCategories(): Promise<Category[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
    const custom: Category[] = raw ? JSON.parse(raw) : [];
    return [...BUILT_IN_CATEGORIES, ...custom];
  } catch {
    return [...BUILT_IN_CATEGORIES];
  }
}

export async function saveCustomCategories(categories: Category[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {}
}

export async function addCategory(name: string): Promise<Category[]> {
  const trimmed = name.trim();
  const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newCat: Category = { id, name: trimmed };
  const all = await loadCategories();
  const custom = all.filter(c => !c.isBuiltIn);
  const updated = [...custom, newCat];
  await saveCustomCategories(updated);
  return [...BUILT_IN_CATEGORIES, ...updated];
}

export async function deleteCategory(id: string): Promise<Category[]> {
  const all = await loadCategories();
  const custom = all.filter(c => !c.isBuiltIn && c.id !== id);
  await saveCustomCategories(custom);
  return [...BUILT_IN_CATEGORIES, ...custom];
}
