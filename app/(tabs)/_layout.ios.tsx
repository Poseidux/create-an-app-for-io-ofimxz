import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="timer" android="timer" />
        <Label>Stopwatch</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
