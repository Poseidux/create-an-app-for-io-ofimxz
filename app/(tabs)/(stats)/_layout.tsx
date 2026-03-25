import { Stack } from 'expo-router/stack';

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: process.env.EXPO_OS === 'ios',
        headerBlurEffect: 'systemMaterial',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Stats' }} />
    </Stack>
  );
}
