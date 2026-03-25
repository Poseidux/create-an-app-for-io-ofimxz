import React from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { Href } from 'expo-router';

const TABS = [
  { name: '(stopwatches)', route: '/(tabs)/(stopwatches)' as Href, icon: 'timer' as const, label: 'Stopwatches' },
  { name: '(history)',     route: '/(tabs)/(history)'     as Href, icon: 'history' as const, label: 'History' },
  { name: '(stats)',       route: '/(tabs)/(stats)'       as Href, icon: 'bar_chart' as const, label: 'Stats' },
  { name: '(settings)',   route: '/(tabs)/(settings)'    as Href, icon: 'settings' as const, label: 'Settings' },
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
        <Stack.Screen name="(history)" />
        <Stack.Screen name="(stats)" />
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
