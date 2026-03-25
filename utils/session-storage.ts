import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '../types/stopwatch';

const SESSIONS_KEY = '@chroniqo_sessions';

export async function getSessions(): Promise<Session[]> {
  try {
    const r = await AsyncStorage.getItem(SESSIONS_KEY);
    return r ? JSON.parse(r) : [];
  } catch (e) {
    console.error('[session-storage] getSessions error:', e);
    return [];
  }
}

export async function saveSession(session: Session): Promise<void> {
  try {
    console.log(`[session-storage] saveSession: id=${session.id}, stopwatch="${session.stopwatchName}", totalTime=${session.totalTime}ms`);
    const sessions = await getSessions();
    const updated = [session, ...sessions];
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[session-storage] saveSession error:', e);
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    console.log(`[session-storage] deleteSession: id=${id}`);
    const sessions = await getSessions();
    const updated = sessions.filter(s => s.id !== id);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[session-storage] deleteSession error:', e);
  }
}

export async function getSession(id: string): Promise<Session | null> {
  try {
    const sessions = await getSessions();
    return sessions.find(s => s.id === id) ?? null;
  } catch (e) {
    console.error('[session-storage] getSession error:', e);
    return null;
  }
}
