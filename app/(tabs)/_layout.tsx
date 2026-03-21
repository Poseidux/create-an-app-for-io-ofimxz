import { Stack } from 'expo-router';
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

export default function TabLayout() {
  useSubscriptionGuard();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="(home)" />
    </Stack>
  );
}
