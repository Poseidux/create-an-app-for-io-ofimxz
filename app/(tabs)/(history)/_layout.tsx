import { Stack } from 'expo-router/stack';

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: 'Session Detail',
          headerLargeTitle: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
