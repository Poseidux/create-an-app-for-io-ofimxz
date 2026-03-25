import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(stopwatches)">
        <Icon sf="stopwatch" android="timer" />
        <Label>Stopwatches</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        <Icon sf="clock.arrow.circlepath" android="history" />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(stats)">
        <Icon sf="chart.bar" android="bar_chart" />
        <Label>Stats</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape" android="settings" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
