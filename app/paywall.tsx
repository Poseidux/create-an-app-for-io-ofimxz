/**
 * Paywall Screen
 *
 * One-time non-consumable purchase to unlock unlimited stopwatches.
 * Shown only when the user tries to create a 4th stopwatch.
 */

import React, { useState } from "react";
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
import { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/contexts/SubscriptionContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "⏱",
    title: "Unlimited Stopwatches",
    description: "Create as many stopwatches as you need",
  },
  {
    icon: "🔓",
    title: "One-Time Unlock",
    description: "Pay once, use forever — no subscription",
  },
  {
    icon: "💾",
    title: "All Future Features",
    description: "Get every new feature as the app grows",
  },
];

const featureIconColors = [
  "rgba(255, 215, 0, 0.25)",
  "rgba(76, 217, 100, 0.25)",
  "rgba(90, 200, 250, 0.25)",
];

export default function PaywallScreen() {
  const router = useRouter();

  const {
    packages,
    loading,
    isSubscribed,
    isWeb,
    purchasePackage,
    restorePurchases,
    mockWebPurchase,
    mockNativePurchase,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(packages[0] || null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [webMockState, setWebMockState] = useState<"idle" | "processing">("idle");
  const [webMockDialogState, setWebMockDialogState] = useState<"hidden" | "selecting" | "failed">("hidden");

  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log('[Paywall] Purchase button pressed, package:', selectedPackage.identifier);
    try {
      setPurchasing(true);
      const success = await purchasePackage(selectedPackage);
      if (success) {
        console.log('[Paywall] Purchase successful');
        Alert.alert("Unlocked!", "You now have unlimited stopwatches.", [
          { text: "Let's go!", onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.log('[Paywall] Purchase failed:', error?.message);
      Alert.alert("Purchase Failed", error.message || "Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log('[Paywall] Restore Purchases pressed');
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      if (restored) {
        console.log('[Paywall] Restore successful');
        Alert.alert("Restored!", "Your purchase has been restored.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases."
        );
      }
    } catch (error: any) {
      console.log('[Paywall] Restore failed:', error?.message);
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log('[Paywall] Close pressed');
    router.back();
  };

  const handleWebMockPurchase = async () => {
    if (!selectedPackage) return;
    console.log('[Paywall] Web mock purchase pressed');
    setWebMockState("processing");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setWebMockState("idle");
    setWebMockDialogState("selecting");
  };

  // Already unlocked
  if (isSubscribed) {
    return (
      <View style={styles.subscribedContainer}>
        <LinearGradient
          colors={["#667EEA", "#764BA2", "#f093fb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.subscribedGradient}
        >
          <View style={[styles.floatingOrb, styles.orb1]} />
          <View style={[styles.floatingOrb, styles.orb2]} />
          <View style={[styles.floatingOrb, styles.orb3]} />

          <SafeAreaView edges={["top", "bottom"]} style={styles.subscribedSafeArea}>
            <TouchableOpacity style={styles.subscribedCloseButton} onPress={handleClose}>
              <Text style={styles.subscribedCloseText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.subscribedContent}>
              <View style={styles.celebrationIconContainer}>
                <View style={styles.celebrationGlow} />
                <Text style={styles.celebrationIcon}>🎉</Text>
              </View>

              <View style={styles.proMemberBadge}>
                <Text style={styles.proMemberText}>PRO UNLOCKED</Text>
              </View>

              <Text style={styles.subscribedTitle}>You're All Set!</Text>
              <Text style={styles.subscribedSubtitle}>
                Unlimited stopwatches are now available
              </Text>

              <View style={styles.featuresCard}>
                <Text style={styles.featuresCardTitle}>Unlocked Features</Text>
                {FEATURES.map((feature, index) => (
                  <View key={index} style={styles.featureCheckRow}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                    <Text style={styles.featureCheckText}>{feature.title}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.exploreButton} onPress={handleClose}>
                <View style={styles.exploreButtonInner}>
                  <Text style={styles.exploreButtonText}>Start Using Pro</Text>
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#667EEA", "#764BA2", "#f093fb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={[styles.floatingOrb, styles.orb1]} />
          <View style={[styles.floatingOrb, styles.orb2]} />
          <View style={[styles.floatingOrb, styles.orb3]} />

          <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const purchaseButtonLabel = selectedPackage
    ? selectedPackage.product.priceString
      ? `Unlock for ${selectedPackage.product.priceString}`
      : "Unlock Pro"
    : "Select a plan";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667EEA", "#764BA2", "#f093fb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={[styles.floatingOrb, styles.orb1]} />
        <View style={[styles.floatingOrb, styles.orb2]} />
        <View style={[styles.floatingOrb, styles.orb3]} />

        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
              <Text style={styles.title}>Unlock Unlimited</Text>
              <Text style={styles.subtitle}>
                Create as many stopwatches as you need — one-time purchase
              </Text>
            </View>

            {/* Features */}
            <View style={styles.featuresCard}>
              <Text style={styles.featuresCardTitle}>What You'll Get</Text>
              {FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: featureIconColors[index % featureIconColors.length] }]}>
                    <Text style={styles.featureIconText}>{feature.icon}</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Package Selection */}
            {packages.length > 0 && (
              <View style={styles.packagesContainer}>
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.identifier === pkg.identifier;
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[
                        styles.packageCard,
                        isSelected && styles.packageCardSelected,
                      ]}
                      onPress={() => {
                        console.log('[Paywall] Package selected:', pkg.identifier);
                        setSelectedPackage(pkg);
                      }}
                    >
                      {isSelected && <View style={styles.selectedIndicator} />}
                      <View style={styles.packageHeader}>
                        <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                        {isSelected && (
                          <View style={styles.checkmarkCircle}>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        )}
                      </View>
                      {pkg.product.priceString ? (
                        <Text style={styles.packagePrice}>
                          {pkg.product.priceString}
                        </Text>
                      ) : null}
                      {pkg.product.description ? (
                        <Text style={styles.packageDescription}>
                          {pkg.product.description}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* No packages — Expo Go fallback */}
            {!isWeb && packages.length === 0 && !loading && (
              <View style={styles.noPackagesContainer}>
                <Text style={styles.noPackagesText}>
                  Purchases are not available in standard Expo Go.
                </Text>
                <Text style={[styles.noPackagesText, { marginTop: 8, opacity: 0.7 }]}>
                  Use a development build or production build to test purchases.
                </Text>
                {__DEV__ && (
                  <TouchableOpacity
                    style={styles.devMockButton}
                    onPress={async () => {
                      console.log('[Paywall] Dev: Simulate Purchase pressed');
                      await mockNativePurchase();
                      router.back();
                    }}
                  >
                    <Text style={styles.devMockButtonText}>Dev: Simulate Purchase</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            {isWeb ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!selectedPackage || webMockState === "processing") && styles.buttonDisabled,
                  ]}
                  onPress={handleWebMockPurchase}
                  disabled={!selectedPackage || webMockState === "processing"}
                >
                  {webMockState === "processing" ? (
                    <ActivityIndicator color="#764BA2" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{purchaseButtonLabel}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.legalText}>
                  Preview mode — purchases available in the mobile app
                </Text>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!selectedPackage || purchasing) && styles.buttonDisabled,
                  ]}
                  onPress={handlePurchase}
                  disabled={!selectedPackage || purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#764BA2" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{purchaseButtonLabel}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.legalText}>
                  Payment will be charged to your{" "}
                  {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account at confirmation.
                </Text>
              </>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Web Mock Purchase Dialog */}
      {isWeb && webMockDialogState !== "hidden" && (
        <View style={styles.webDialogOverlay}>
          <View style={styles.webDialogBox}>
            {webMockDialogState === "selecting" && (
              <>
                <Text style={styles.webDialogTitle}>Test Purchase</Text>
                <Text style={styles.webDialogBody}>
                  {`Package: ${selectedPackage?.identifier}\nPrice: ${selectedPackage?.product.priceString || "N/A"}`}
                </Text>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => setWebMockDialogState("failed")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#FF3B30" }]}>
                    Test Failed Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => {
                    setWebMockDialogState("hidden");
                    mockWebPurchase();
                    router.back();
                  }}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    Test Valid Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {webMockDialogState === "failed" && (
              <>
                <Text style={styles.webDialogTitle}>Purchase Failed</Text>
                <Text style={styles.webDialogBody}>
                  Test purchase failure: no real transaction occurred
                </Text>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 64,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  premiumBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  featuresCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    width: "100%",
  },
  featuresCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  featureIconText: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  featureDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  packagesContainer: {
    gap: 12,
    width: "100%",
  },
  packageCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    width: "100%",
  },
  packageCardSelected: {
    borderColor: "#fff",
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  selectedIndicator: {
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
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 4,
  },
  noPackagesContainer: {
    padding: 24,
    alignItems: "center",
  },
  noPackagesText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
  devMockButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  devMockButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    textAlign: "center",
  },
  bottomActions: {
    padding: 24,
    paddingBottom: 32,
    gap: 12,
    width: "100%",
  },
  primaryButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#764BA2",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  legalText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 16,
  },
  webDialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  webDialogBox: {
    backgroundColor: "#f2f2f7",
    borderRadius: 14,
    width: "85%",
    maxWidth: 400,
    overflow: "hidden",
  },
  webDialogTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  webDialogBody: {
    fontSize: 13,
    color: "#000",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    lineHeight: 18,
  },
  webDialogDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  webDialogButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  webDialogButtonText: {
    fontSize: 17,
  },
  // Subscribed celebration styles
  subscribedContainer: {
    flex: 1,
  },
  subscribedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  subscribedSafeArea: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  orb1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  orb2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -40,
  },
  orb3: {
    width: 100,
    height: 100,
    top: SCREEN_HEIGHT * 0.3,
    right: 20,
  },
  subscribedCloseButton: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  subscribedCloseText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  subscribedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  celebrationIconContainer: {
    position: "relative",
    marginBottom: 20,
  },
  celebrationGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    top: -20,
    left: -20,
  },
  celebrationIcon: {
    fontSize: 80,
  },
  proMemberBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  proMemberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1.5,
  },
  subscribedTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subscribedSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginBottom: 32,
  },
  featureCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkMark: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  featureCheckText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  exploreButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  exploreButtonInner: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 16,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
