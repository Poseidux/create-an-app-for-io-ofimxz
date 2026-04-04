import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function GoalModal() {
  const router = useRouter();
  useEffect(() => {
    router.back();
  }, [router]);
  return null;
}
