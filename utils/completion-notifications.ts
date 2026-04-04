import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage key for persisted notificationId map ────────────────────────────

const NOTIFICATION_IDS_KEY = 'timer_notification_ids';

async function getNotificationIdMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setNotificationIdMap(map: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(map));
  } catch {}
}

// ─── Android channel setup ────────────────────────────────────────────────────

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('timer-complete', {
      name: 'Timer Complete',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    console.log('[CompletionNotification] Android channel ensured: timer-complete');
  } catch (e) {
    console.warn('[CompletionNotification] Failed to set Android notification channel:', e);
  }
}

// ─── Permission helper ────────────────────────────────────────────────────────

async function requestPermissionsIfNeeded(): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log(`[CompletionNotification] Notification permission status: ${status}`);
  } catch (e) {
    console.warn('[CompletionNotification] Failed to request notification permissions:', e);
  }
}

// ─── Schedule OS-level trigger notification ───────────────────────────────────

/**
 * Schedules a local notification with a TIME_INTERVAL trigger so the OS fires
 * it even when the app is backgrounded, locked, or closed.
 *
 * @param timerId   Unique timer ID used to track/cancel the notification.
 * @param timerName Display name shown in the notification body.
 * @param secondsRemaining Seconds until the timer completes.
 */
export async function scheduleTimerNotification(
  timerId: string,
  timerName: string,
  secondsRemaining: number,
): Promise<void> {
  if (secondsRemaining <= 0) {
    console.warn(`[CompletionNotification] scheduleTimerNotification called with secondsRemaining=${secondsRemaining}, skipping`);
    return;
  }

  console.log(`[CompletionNotification] Scheduling OS trigger notification: timerId=${timerId}, name="${timerName}", seconds=${secondsRemaining}`);

  try {
    await requestPermissionsIfNeeded();
    await ensureAndroidChannel();

    // Cancel any existing notification for this timer first
    await cancelTimerNotification(timerId);

    const content: Notifications.NotificationContentInput = {
      title: 'Timer Complete',
      body: `"${timerName}" has finished!`,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'timer-complete' } : {}),
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsRemaining,
      },
    });

    // Persist the mapping so we can cancel across app restarts
    const map = await getNotificationIdMap();
    map[timerId] = notificationId;
    await setNotificationIdMap(map);

    console.log(`[CompletionNotification] OS notification scheduled: notificationId=${notificationId}, fires in ${secondsRemaining}s`);
  } catch (e) {
    console.warn('[CompletionNotification] Failed to schedule OS trigger notification:', e);
  }
}

/**
 * Cancels the scheduled OS notification for a timer (on pause, reset, or early stop).
 */
export async function cancelTimerNotification(timerId: string): Promise<void> {
  try {
    const map = await getNotificationIdMap();
    const notificationId = map[timerId];
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      delete map[timerId];
      await setNotificationIdMap(map);
      console.log(`[CompletionNotification] Cancelled OS notification: timerId=${timerId}, notificationId=${notificationId}`);
    }
  } catch (e) {
    console.warn(`[CompletionNotification] Failed to cancel notification for timerId=${timerId}:`, e);
  }
}

// ─── Haptics ──────────────────────────────────────────────────────────────────

async function fireHaptics(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise(resolve => setTimeout(resolve, 80));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise(resolve => setTimeout(resolve, 80));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Vibration.vibrate([0, 300, 100, 150, 100, 150]);
    }
  } catch {}
}

// ─── Foreground completion (haptics only — OS already fired the notification) ─

/**
 * Called when the timer completes while the app is in the foreground.
 * The OS notification was already scheduled and will fire (or already fired).
 * This just triggers haptics for the in-app experience.
 *
 * Also cancels the scheduled notification since the timer is done — the OS
 * notification will have already fired at this point (or fires momentarily).
 */
export async function notifyTimerComplete(timerId: string, name: string): Promise<void> {
  console.log(`[CompletionNotification] Timer complete (foreground): timerId=${timerId}, name="${name}"`);
  // Cancel the scheduled notification — it either already fired or we're completing
  // in-app so we don't want a duplicate banner after the fact.
  await cancelTimerNotification(timerId);
  await fireHaptics();
}

export async function notifyRoutineComplete(name: string): Promise<void> {
  console.log(`[CompletionNotification] Routine complete: ${name}`);
  await requestPermissionsIfNeeded();
  await ensureAndroidChannel();
  try {
    const content: Notifications.NotificationContentInput = {
      title: 'Routine Complete',
      body: `"${name}" is done. Great work!`,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'timer-complete' } : {}),
    };
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    console.log(`[CompletionNotification] Routine complete notification fired: "${name}"`);
  } catch (e) {
    console.warn('[CompletionNotification] Failed to fire routine complete notification:', e);
  }
  await fireHaptics();
}
