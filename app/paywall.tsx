/**
 * Paywall Screen — Unlimited Stopwatches (Lifetime Purchase)
 *
 * - Fetches the 'stopwatch_unlimited' offering explicitly (never uses current/default)
 * - One-time non-consumable purchase only — no subscriptions
 * - Includes Restore Purchases
 * - Mobile (iOS/Android) only — web shows a graceful message
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
// react-native-purchases is a native-only module — import conditionally to avoid
// crashing the web bundle. All SDK calls are already guarded by isWeb checks.
import type { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/contexts/SubscriptionContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const OFFERING_ID = "stopwatch_unlimited";

const FEATURES = [
  {
    icon: "∞",
    title: "Unlimited Stopwatches",
    description: "Create as many stopwatches as you need — no cap, ever",
  },
  {
    icon: "🏷️",
    title: "Unlimited Categories",
    description: "Organise every stopwatch with custom categories",
  },
  {
    icon: "⚡",
    title: "One-Time Purchase",
    description: "Pay once, own it forever — no subscription, no renewals",
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { isSubscribed, isWeb, purchasePackage, restorePurchases, mockNativePurchase } = useSubscription();

  const [offeringPackages, setOfferingPackages] = useState<PurchasesPackage[]>([]);
  const [offeringLoading, setOfferingLoading] = useState(true);
  const [offeringMissing, setOfferingMissing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Fetch the stopwatch_unlimited offering explicitly — never use current/default
  useEffect(() => {
    if (isWeb) {
      setOfferingLoading(false);
      return;
    }
    const load = async () => {
      try {
        console.log(`[Paywall] Fetching offering '${OFFERING_ID}'`);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Purchases = require("react-native-purchases").default;
        if (typeof Purchases?.getOfferings !== "function") {
          console.warn("[Paywall] react-native-purchases not available (Expo Go). Use a dev/prod build.");
          setOfferingLoading(false);
          return;
        }
        const offerings = await Purchases.getOfferings();
        const target = offerings.all[OFFERING_ID];
        if (target && target.availablePackages.length > 0) {
          console.log(`[Paywall] Offering '${OFFERING_ID}' loaded — ${target.availablePackages.length} package(s)`);
          setOfferingPackages(target.availablePackages);
          setSelectedPackage(target.availablePackages[0]);
          setOfferingMissing(false);
        } else {
          console.warn(`[Paywall] Offering '${OFFERING_ID}' not found or empty. Available: ${Object.keys(offerings.all).join(", ")}`);
          setOfferingMissing(true);
        }
      } catch (err) {
        console.error("[Paywall] Failed to fetch offerings:", err);
        setOfferingMissing(true);
      } finally {
        setOfferingLoading(false);
      }
    };
    load();
  }, [isWeb]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log(`[Paywall] Purchase pressed — package: ${selectedPackage.identifier}`);
    try {
      setPurchasing(true);
      const success = await purchasePackage(selectedPackage);
      if (success) {
        console.log("[Paywall] Purchase successful");
        Alert.alert("Unlocked!", "You now have unlimited stopwatches.", [
          { text: "Let's go!", onPress: () => router.replace("/(tabs)/(home)") },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Purchase Failed", error.message || "Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log("[Paywall] Restore Purchases pressed");
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      if (restored) {
        console.log("[Paywall] Restore successful");
        Alert.alert("Restored!", "Your purchase has been restored.", [
          { text: "OK", onPress: () => router.replace("/(tabs)/(home)") },
        ]);
      } else {
        Alert.alert("No Purchase Found", "We couldn't find a previous purchase on this account.");
      }
    } catch (error: any) {
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log("[Paywall] Close pressed");
    router.back();
  };

  // Already unlocked
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.floatingOrb, styles.orb1]} />
        <View style={[styles.floatingOrb, styles.orb2]} />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.centeredContent}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>UNLOCKED</Text>
            </View>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>Unlimited stopwatches are active</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Loading state
  if (offeringLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const priceString = selectedPackage?.product?.priceString
    ? String(selectedPackage.product.priceString)
    : null;
  const purchaseButtonLabel = priceString ? `Unlock for ${priceString}` : "Unlock Forever";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.floatingOrb, styles.orb1]} />
      <View style={[styles.floatingOrb, styles.orb2]} />
      <View style={[styles.floatingOrb, styles.orb3]} />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ONE-TIME PURCHASE</Text>
            </View>
            <Text style={styles.title}>Unlock Unlimited{"\n"}Stopwatches</Text>
            <Text style={styles.subtitle}>
              You've reached the 3-stopwatch limit.{"\n"}Upgrade once — yours forever.
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresCardTitle}>What You Unlock</Text>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIconText}>{feature.icon}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Package selection — only shown when packages are available */}
          {offeringPackages.length > 0 && (
            <View style={styles.packagesContainer}>
              {offeringPackages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const pkgPrice = pkg.product?.priceString ? String(pkg.product.priceString) : null;
                const pkgTitle = pkg.product?.title ? String(pkg.product.title) : "Lifetime Unlock";
                const pkgDesc = pkg.product?.description ? String(pkg.product.description) : null;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                    onPress={() => {
                      console.log(`[Paywall] Package selected: ${pkg.identifier}`);
                      setSelectedPackage(pkg);
                    }}
                  >
                    {isSelected && <View style={styles.selectedBar} />}
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageTitle}>{pkgTitle}</Text>
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      )}
                    </View>
                    {pkgPrice !== null && (
                      <Text style={styles.packagePrice}>{pkgPrice}</Text>
                    )}
                    {pkgDesc !== null && (
                      <Text style={styles.packageDescription}>{pkgDesc}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Offering not configured yet */}
          {offeringMissing && !isWeb && (
            <View style={styles.missingContainer}>
              <Text style={styles.missingTitle}>Products not configured yet</Text>
              <Text style={styles.missingBody}>
                The offering <Text style={styles.missingCode}>stopwatch_unlimited</Text> hasn't been set up in the RevenueCat dashboard yet.
                {"\n\n"}See the setup guide in the app description for step-by-step instructions.
              </Text>
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.devMockButton}
                  onPress={async () => {
                    console.log("[Paywall] Dev: Simulate Purchase pressed");
                    await mockNativePurchase();
                    router.replace("/(tabs)/(home)");
                  }}
                >
                  <Text style={styles.devMockButtonText}>Dev: Simulate Purchase</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Web — purchases not available */}
          {isWeb && (
            <View style={styles.missingContainer}>
              <Text style={styles.missingTitle}>Available on mobile only</Text>
              <Text style={styles.missingBody}>
                In-app purchases are only available in the iOS and Android apps.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom actions — only shown on native with packages */}
        {!isWeb && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (offeringPackages.length === 0 || !selectedPackage || purchasing) && styles.buttonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={offeringPackages.length === 0 || !selectedPackage || purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#0f3460" />
              ) : (
                <Text style={styles.primaryButtonText}>{purchaseButtonLabel}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchase</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.legalText}>
              One-time purchase. No subscription, no recurring charges.
              {Platform.OS === "ios" ? " Payment charged to your Apple ID account." : " Payment charged to your Google Play account."}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  orb1: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
  },
  orb2: {
    width: 200,
    height: 200,
    bottom: 120,
    left: -60,
  },
  orb3: {
    width: 120,
    height: 120,
    top: SCREEN_HEIGHT * 0.35,
    right: 10,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
  featuresCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  featuresCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 16,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureIconText: {
    fontSize: 20,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 18,
  },
  packagesContainer: {
    gap: 10,
    marginBottom: 8,
  },
  packageCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    overflow: "hidden",
  },
  packageCardSelected: {
    borderColor: "#fff",
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  selectedBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#fff",
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "bold",
  },
  packagePrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginTop: 6,
  },
  packageDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  missingContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 8,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  missingBody: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 20,
  },
  missingCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "rgba(255,255,255,0.9)",
  },
  devMockButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
  },
  devMockButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  celebrationEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginTop: 12,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#0f3460",
    fontSize: 17,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  restoreButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  restoreButtonText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.75)",
  },
  legalText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.45)",
    textAlign: "center",
    lineHeight: 16,
  },
});
