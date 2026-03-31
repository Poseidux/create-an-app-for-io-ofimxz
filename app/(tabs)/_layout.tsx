import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { Href } from 'expo-router';

const TABS = [
  { name: '(today)',    route: '/(tabs)/(today)'    as Href, icon: 'timer'     as const, label: 'Today'    },
  { name: '(sessions)', route: '/(tabs)/(sessions)' as Href, icon: 'history'   as const, label: 'Sessions' },
  { name: '(insights)', route: '/(tabs)/(insights)' as Href, icon: 'bar_chart' as const, label: 'Insights' },
  { name: '(profile)',  route: '/(tabs)/(profile)'  as Href, icon: 'person'    as const, label: 'Profile'  },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="(today)" />
        <Stack.Screen name="(sessions)" />
        <Stack.Screen name="(insights)" />
        <Stack.Screen name="(profile)" />
      </Stack>
      <FloatingTabBar tabs={TABS} containerWidth={340} borderRadius={35} bottomMargin={20} />
    </View>
  );
}
