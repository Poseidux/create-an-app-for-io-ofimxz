import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function notifyTimerComplete(name: string): Promise<void> {
  console.log(`[CompletionNotification] Timer complete: ${name}`);
  try {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  } catch {}
}

export async function notifyRoutineComplete(name: string): Promise<void> {
  console.log(`[CompletionNotification] Routine complete: ${name}`);
  try {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  } catch {}
}
