import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(today)">
        <Icon sf="timer" android="timer" />
        <Label>Today</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(sessions)">
        <Icon sf="clock.arrow.circlepath" android="history" />
        <Label>Sessions</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(insights)">
        <Icon sf="chart.bar" android="bar_chart" />
        <Label>Insights</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <Icon sf="person.circle" android="person" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
