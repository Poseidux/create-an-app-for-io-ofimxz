/**
 * RevenueCat Subscription Context (Anonymous Mode)
 *
 * Provides subscription management for Expo + React Native apps.
 * Reads API keys from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via RevenueCat SDK
 *
 * NOTE: Running in anonymous mode - purchases won't sync across devices.
 * To enable cross-device sync:
 * 1. Set up authentication with setup_auth
 * 2. Re-run setup_revenuecat to upgrade this file
 *
 * SETUP:
 * 1. Wrap your app with <SubscriptionProvider>
 * 2. Run: pnpm install react-native-purchases && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import * as SecureStore from "expo-secure-store";

// Production iOS API key
const IOS_API_KEY = "appl_AdKKQlfQClEouHLVsyJkkDtEeWK";
const ENTITLEMENT_ID = "unlimited_stopwatches";

// Check if running on web
const isWeb = Platform.OS === "web";
// Scoped storage keys — hardcoded project ID to avoid dependency on Constants
const _PROJECT_SCOPE = "e012751f-0ebb-4a5c-acc4-e709e57f0b3e";
// Scoped native cache key — persists real subscription state for fast restore on bundle reload
const NATIVE_PURCHASE_KEY = `rc_subscribed_${_PROJECT_SCOPE}`;

interface SubscriptionContextType {
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** All offerings from RevenueCat */
  offerings: PurchasesOfferings | null;
  /** The current/default offering */
  currentOffering: PurchasesOffering | null;
  /** Available packages in the current offering */
  packages: PurchasesPackage[];
  /** The $rc_lifetime package from the stopwatch_unlimited offering (real SDK object) */
  currentPackage: PurchasesPackage | null;
  /** Loading state during initialization */
  loading: boolean;
  /** Alias for loading — used by paywall */
  isLoading: boolean;
  /** Error message if offerings failed to load */
  error: string | null;
  /** Whether running on web (purchases not available) */
  isWeb: boolean;
  /** Purchase a package - returns true if successful */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases - returns true if subscription found */
  restorePurchases: () => Promise<boolean>;
  /** Manually re-check subscription status */
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [currentPackage, setCurrentPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize RevenueCat on mount
  useEffect(() => {
    let customerInfoListener: { remove: () => void } | null = null;

    const initRevenueCat = async () => {
      try {
        // Web platform: SDK doesn't work
        if (isWeb) {
          setLoading(false);
          return;
        }

        // Check if the react-native-purchases native module is available.
        // It is NOT available in standard Expo Go — only in custom dev builds and production builds.
        // DO NOT change this check or replace with AsyncStorage-based workarounds.
        if (typeof Purchases?.configure !== "function") {
          setLoading(false);
          return;
        }

        // Use DEBUG log level in development, INFO in production
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

        // Restore cached subscription state immediately to avoid paywall flash on bundle reload.
        // The customerInfoUpdateListener (fired by configure() below) is the authoritative
        // source and will immediately overwrite this with real RC Keychain data.
        const cached = await SecureStore.getItemAsync(NATIVE_PURCHASE_KEY).catch(() => null);
        if (cached === "true") {
          setIsSubscribed(true);
        }

        await Purchases.configure({ apiKey: IOS_API_KEY });

        // Listen for real-time subscription changes (e.g., purchase from another device)
        customerInfoListener = Purchases.addCustomerInfoUpdateListener(
          (customerInfo) => {
            const hasEntitlement =
              typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !==
              "undefined";
            setIsSubscribed(hasEntitlement);
          }
        );

        // Fetch available products/packages
        await fetchOfferings();

        // Check initial subscription status
        await checkSubscription();
      } catch (err) {
        // Silently handle init errors
      } finally {
        setLoading(false);
      }
    };

    initRevenueCat();

    // Cleanup listener on unmount
    return () => {
      if (customerInfoListener) {
        customerInfoListener.remove();
      }
    };
  }, []);

  const fetchOfferings = async () => {
    if (isWeb) return;
    try {
      const fetchedOfferings = await Purchases.getOfferings();
      setOfferings(fetchedOfferings);

      // Prefer the "stopwatch_unlimited" offering; fall back to current
      const offering =
        fetchedOfferings.all["stopwatch_unlimited"] ?? fetchedOfferings.current;

      if (offering) {
        setCurrentOffering(offering);
        // Sort packages so $rc_lifetime appears first
        const sorted = [...offering.availablePackages].sort((a, b) => {
          if (a.identifier === "$rc_lifetime") return -1;
          if (b.identifier === "$rc_lifetime") return 1;
          return 0;
        });
        setPackages(sorted);

        // Find the $rc_lifetime package and expose it as currentPackage
        const lifetimePkg = offering.availablePackages.find(
          (p) => p.identifier === "$rc_lifetime"
        ) ?? null;
        setCurrentPackage(lifetimePkg);
      } else {
        setError("No offerings available. Please try again later.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load offerings.");
    }
  };

  const checkSubscription = async () => {
    if (isWeb) return;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, hasEntitlement ? "true" : "false").catch(() => {});
    } catch (err) {
      // Don't reset isSubscribed on error — the customerInfoUpdateListener
      // already set it from local cache after configure(). Overriding with false
      // would incorrectly show the paywall to subscribed users on network errors.
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    if (isWeb) {
      return false;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      }
      return hasEntitlement;
    } catch (error: any) {
      // Don't treat user cancellation as an error
      if (!error.userCancelled) {
        throw error;
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (isWeb) {
      return false;
    }
    const customerInfo = await Purchases.restorePurchases();
    const hasEntitlement =
      typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
    setIsSubscribed(hasEntitlement);
    await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, hasEntitlement ? "true" : "false").catch(() => {});
    return hasEntitlement;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        offerings,
        currentOffering,
        packages,
        currentPackage,
        loading,
        isLoading: loading,
        error,
        isWeb,
        purchasePackage,
        restorePurchases,
        checkSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription state and methods.
 *
 * @example
 * const { isSubscribed, purchasePackage, packages, isWeb } = useSubscription();
 *
 * if (!isSubscribed) {
 *   return <Button onPress={() => router.push("/paywall")}>Upgrade</Button>;
 * }
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within SubscriptionProvider"
    );
  }
  return context;
}
