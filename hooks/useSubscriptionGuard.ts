import { useEffect, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

export function useSubscriptionGuard() {
  const { isSubscribed, loading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboardingComplete()
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(true));
  }, [pathname]);

  useEffect(() => {
    if (!loading && onboardingDone !== null && !isSubscribed) {
      if (onboardingDone) {
        router.replace("/paywall");
      }
    }
  }, [isSubscribed, loading, onboardingDone, router]);
}
