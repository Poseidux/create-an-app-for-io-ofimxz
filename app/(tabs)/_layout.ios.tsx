import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(stopwatches)">
        <Icon sf="stopwatch" android="timer" />
        <Label>Stopwatches</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(timers)">
        <Icon sf="timer" android="hourglass_empty" />
        <Label>Timers</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(insights)">
        <Icon sf="chart.bar" android="bar_chart" />
        <Label>Insights</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gearshape" android="settings" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
