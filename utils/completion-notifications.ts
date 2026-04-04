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

async function scheduleNotification(title: string, body: string): Promise<void> {
  try {
    await ensureAndroidChannel();
    const content: Notifications.NotificationContentInput = {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'timer-complete' } : {}),
    };
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    console.log(`[CompletionNotification] Scheduled notification: "${title}"`);
  } catch (e) {
    console.warn('[CompletionNotification] Failed to schedule notification:', e);
  }
}

async function fireHaptics(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // Fire notification success haptic first, then a heavy impact for maximum feel
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Small gap then a second heavy impact for a distinct "completion" double-pulse
      await new Promise(resolve => setTimeout(resolve, 80));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise(resolve => setTimeout(resolve, 80));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      // Android: strong vibration pattern — long buzz, pause, two short buzzes
      Vibration.vibrate([0, 300, 100, 150, 100, 150]);
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
