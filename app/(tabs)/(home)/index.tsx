// This tab is not used — the app uses (today) as the home tab.
// Redirect to avoid showing a blank screen if navigated here directly.
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function HomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/(today)');
  }, [router]);
  return null;
}
