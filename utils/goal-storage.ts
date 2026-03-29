import AsyncStorage from '@react-native-async-storage/async-storage';

// Goal types for stopwatches
export type StopwatchGoalType = 'target_duration' | 'target_laps' | 'beat_personal_best';

// Goal types for timers
export type TimerGoalType = 'complete_countdown' | 'complete_all_rounds';

export type GoalType = StopwatchGoalType | TimerGoalType;

export type GoalStatus = 'active' | 'achieved' | 'missed';

export interface ItemGoal {
  id: string;
  itemId: string;
  itemName: string;
  itemKind: 'stopwatch' | 'timer';
  goalType: GoalType;
  goalName?: string;
  targetMs?: number;
  targetLaps?: number;
  personalBestMs?: number;
  status: GoalStatus;
  createdAt: string;
  achievedAt?: string;
}

const GOALS_KEY = '@chroniqo_goals_v2';

export async function getGoals(): Promise<ItemGoal[]> {
  try {
    const r = await AsyncStorage.getItem(GOALS_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function getGoalForItem(itemId: string): Promise<ItemGoal | null> {
  try {
    const goals = await getGoals();
    return goals.find(g => g.itemId === itemId) ?? null;
  } catch { return null; }
}

export async function saveGoal(goal: ItemGoal): Promise<void> {
  try {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) goals[idx] = goal;
    else goals.push(goal);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {}
}

export async function deleteGoalForItem(itemId: string): Promise<void> {
  try {
    const goals = await getGoals();
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(
      goals.filter(g => g.itemId !== itemId)
    ));
  } catch {}
}

export async function markGoalAchieved(itemId: string): Promise<void> {
  try {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.itemId === itemId);
    if (idx >= 0) {
      goals[idx] = { ...goals[idx], status: 'achieved', achievedAt: new Date().toISOString() };
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }
  } catch {}
}

export async function markGoalMissed(itemId: string): Promise<void> {
  try {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.itemId === itemId);
    if (idx >= 0) {
      goals[idx] = { ...goals[idx], status: 'missed' };
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }
  } catch {}
}
