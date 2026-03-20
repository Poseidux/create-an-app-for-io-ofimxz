export interface Stopwatch {
  id: string;
  name: string;
  accumulatedMs: number;
  startedAt: number | null;
  isRunning: boolean;
  order: number;
  createdAt: number;
  color?: string;
  category?: string;
}

export const DEFAULT_STOPWATCH_COLOR = '#22c55e';

export function getElapsedMs(sw: Stopwatch): number {
  if (sw.isRunning && sw.startedAt !== null) return sw.accumulatedMs + (Date.now() - sw.startedAt);
  return sw.accumulatedMs;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const centiseconds = Math.floor((ms / 10) % 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);

  const cs = String(centiseconds).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}.${cs}`;
  }
  return `${hh}:${mm}:${ss}.${cs}`;
}
