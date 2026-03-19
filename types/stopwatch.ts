export interface Stopwatch {
  id: string;
  name: string;
  accumulatedMs: number;
  startedAt: number | null;
  isRunning: boolean;
  order: number;
  createdAt: number;
  color?: string;
}

export const DEFAULT_STOPWATCH_COLOR = '#22c55e';

export function getElapsedMs(sw: Stopwatch): number {
  if (sw.isRunning && sw.startedAt !== null) return sw.accumulatedMs + (Date.now() - sw.startedAt);
  return sw.accumulatedMs;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
