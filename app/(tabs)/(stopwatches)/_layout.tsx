import { Stack } from 'expo-router/stack';

export default function StopwatchesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
