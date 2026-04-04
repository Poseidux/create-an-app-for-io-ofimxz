// iOS variant — redirect to today tab
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function HomeRedirectIOS() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/(today)');
  }, [router]);
  return null;
}
