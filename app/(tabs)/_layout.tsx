import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { Href } from 'expo-router';

const TABS = [
  { name: '(stopwatches)', route: '/(tabs)/(stopwatches)' as Href, icon: 'timer' as const,           label: 'Stopwatches' },
  { name: '(timers)',      route: '/(tabs)/(timers)'      as Href, icon: 'hourglass_empty' as const,  label: 'Timers' },
  { name: '(insights)',   route: '/(tabs)/(insights)'    as Href, icon: 'bar_chart' as const,        label: 'Insights' },
  { name: '(settings)',   route: '/(tabs)/(settings)'    as Href, icon: 'settings' as const,         label: 'Settings' },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(stopwatches)" />
        <Stack.Screen name="(timers)" />
        <Stack.Screen name="(insights)" />
        <Stack.Screen name="(settings)" />
      </Stack>
      <FloatingTabBar
        tabs={TABS}
        containerWidth={340}
        borderRadius={35}
        bottomMargin={20}
      />
    </View>
  );
}
