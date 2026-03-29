import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimerMode = 'countdown' | 'interval' | 'hiit';

export interface TimerConfig {
  id: string;
  name: string;
  mode: TimerMode;
  color: string;
  category?: string;
  // countdown
  countdownMs?: number;
  // interval
  workMs?: number;
  restMs?: number;
  rounds?: number;
}

export interface TimerState {
  config: TimerConfig;
  isRunning: boolean;
  isPaused: boolean;
  currentRound: number;
  totalRounds: number;
  phase: 'work' | 'rest' | 'countdown';
  remainingMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedMs: number;
  isComplete: boolean;
}

const TIMERS_KEY = '@chroniqo_timers';

export async function getTimerConfigs(): Promise<TimerConfig[]> {
  try {
    const r = await AsyncStorage.getItem(TIMERS_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function saveTimerConfig(config: TimerConfig): Promise<void> {
  try {
    const configs = await getTimerConfigs();
    const existing = configs.findIndex(c => c.id === config.id);
    if (existing >= 0) configs[existing] = config;
    else configs.push(config);
    await AsyncStorage.setItem(TIMERS_KEY, JSON.stringify(configs));
  } catch {}
}

export async function deleteTimerConfig(id: string): Promise<void> {
  try {
    const configs = await getTimerConfigs();
    await AsyncStorage.setItem(TIMERS_KEY, JSON.stringify(configs.filter(c => c.id !== id)));
  } catch {}
}
