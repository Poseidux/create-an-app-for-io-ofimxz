import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_session', title: 'First Session', description: 'Complete your first session', icon: '🎯' },
  { id: 'sessions_10', title: 'Getting Started', description: 'Complete 10 sessions', icon: '🔥' },
  { id: 'sessions_50', title: 'Dedicated', description: 'Complete 50 sessions', icon: '💪' },
  { id: 'sessions_100', title: 'Century', description: 'Complete 100 sessions', icon: '🏆' },
  { id: 'first_lap', title: 'First Lap', description: 'Record your first lap', icon: '🏁' },
  { id: 'laps_100', title: 'Lap Master', description: 'Record 100 total laps', icon: '🔄' },
  { id: 'sub_60_lap', title: 'Sub-60', description: 'Record a lap under 60 seconds', icon: '⚡' },
  { id: 'sub_30_lap', title: 'Lightning', description: 'Record a lap under 30 seconds', icon: '⚡⚡' },
  { id: 'first_interval', title: 'Interval Starter', description: 'Complete your first interval timer', icon: '⏱️' },
  { id: 'first_hiit', title: 'HIIT It', description: 'Complete your first HIIT workout', icon: '🔥' },
  { id: 'first_goal', title: 'Goal Setter', description: 'Set your first goal', icon: '🎯' },
  { id: 'goal_achieved', title: 'Goal Crusher', description: 'Beat a personal best goal', icon: '🥇' },
];

const ACHIEVEMENTS_KEY = '@chroniqo_achievements';

export async function getUnlockedAchievements(): Promise<Achievement[]> {
  try {
    const r = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function unlockAchievement(id: string): Promise<Achievement | null> {
  try {
    const unlocked = await getUnlockedAchievements();
    if (unlocked.find(a => a.id === id)) return null;
    const def = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return null;
    const achievement: Achievement = { ...def, unlockedAt: new Date().toISOString() };
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlocked, achievement]));
    return achievement;
  } catch { return null; }
}

export async function checkAndUnlockAchievements(params: {
  totalSessions: number;
  totalLaps: number;
  fastestLapMs?: number;
  completedIntervalTimer?: boolean;
  completedHiitTimer?: boolean;
  hasGoal?: boolean;
  beatGoal?: boolean;
}): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  const checks: [string, boolean][] = [
    ['first_session', params.totalSessions >= 1],
    ['sessions_10', params.totalSessions >= 10],
    ['sessions_50', params.totalSessions >= 50],
    ['sessions_100', params.totalSessions >= 100],
    ['first_lap', params.totalLaps >= 1],
    ['laps_100', params.totalLaps >= 100],
    ['sub_60_lap', (params.fastestLapMs ?? Infinity) < 60000],
    ['sub_30_lap', (params.fastestLapMs ?? Infinity) < 30000],
    ['first_interval', !!params.completedIntervalTimer],
    ['first_hiit', !!params.completedHiitTimer],
    ['first_goal', !!params.hasGoal],
    ['goal_achieved', !!params.beatGoal],
  ];
  for (const [id, condition] of checks) {
    if (condition) {
      const a = await unlockAchievement(id);
      if (a) newlyUnlocked.push(a);
    }
  }
  return newlyUnlocked;
}
