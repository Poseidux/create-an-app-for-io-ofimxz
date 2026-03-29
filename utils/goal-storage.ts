import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Goal {
  stopwatchId: string;
  stopwatchName: string;
  targetMs: number;
  type: 'total' | 'lap';
  createdAt: string;
}

const GOALS_KEY = '@chroniqo_goals';

export async function getGoals(): Promise<Goal[]> {
  try {
    const r = await AsyncStorage.getItem(GOALS_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function saveGoal(goal: Goal): Promise<void> {
  try {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.stopwatchId === goal.stopwatchId && g.type === goal.type);
    if (idx >= 0) goals[idx] = goal;
    else goals.push(goal);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {}
}

export async function deleteGoal(stopwatchId: string, type: 'total' | 'lap'): Promise<void> {
  try {
    const goals = await getGoals();
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(
      goals.filter(g => !(g.stopwatchId === stopwatchId && g.type === type))
    ));
  } catch {}
}
