export interface Lap {
  id: string;
  lapNumber: number;
  lapTime: number;       // duration of this lap in ms
  splitTime: number;     // total elapsed at this lap in ms
  note?: string;
  timestamp: string;     // ISO 8601
}

export interface Session {
  id: string;
  stopwatchId: string;
  stopwatchName: string;
  category: string;
  color: string;
  totalTime: number;     // ms
  laps: Lap[];
  note?: string;
  startedAt: string;     // ISO 8601
  endedAt: string;       // ISO 8601
}

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
  laps: Lap[];
  note?: string;
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
  const hours = Math.floor(totalSeconds / 3600);

  const cs = String(centiseconds).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');

  return `${hh}:${mm}:${ss}.${cs}`;
}

export function getDays(ms: number): number {
  return Math.floor(ms / 86400000);
}
