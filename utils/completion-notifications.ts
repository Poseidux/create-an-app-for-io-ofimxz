import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

async function requestPermissionsIfNeeded(): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log(`[CompletionNotification] Notification permission status: ${status}`);
  } catch (e) {
    console.warn('[CompletionNotification] Failed to request notification permissions:', e);
  }
}

async function scheduleNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { seconds: 1 },
    });
    console.log(`[CompletionNotification] Scheduled notification: "${title}"`);
  } catch (e) {
    console.warn('[CompletionNotification] Failed to schedule notification:', e);
  }
}

async function fireHaptics(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  } catch {}
}

export async function notifyTimerComplete(name: string): Promise<void> {
  console.log(`[CompletionNotification] Timer complete: ${name}`);
  await requestPermissionsIfNeeded();
  await Promise.all([
    scheduleNotification('Timer Complete', `"${name}" has finished!`),
    fireHaptics(),
  ]);
}

export async function notifyRoutineComplete(name: string): Promise<void> {
  console.log(`[CompletionNotification] Routine complete: ${name}`);
  await requestPermissionsIfNeeded();
  await Promise.all([
    scheduleNotification('Routine Complete', `"${name}" is done. Great work!`),
    fireHaptics(),
  ]);
}
