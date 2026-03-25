import { Stack } from 'expo-router/stack';

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: process.env.EXPO_OS === 'ios',
        headerBlurEffect: 'systemMaterial',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'History' }} />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Session Detail',
          headerLargeTitle: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
