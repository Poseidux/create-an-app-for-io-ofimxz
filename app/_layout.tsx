import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, Redirect, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { StopwatchProvider } from "@/contexts/StopwatchContext";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { CategoryProvider } from "@/contexts/CategoryContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const CustomDefaultTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    primary: "rgb(0, 122, 255)",
    background: "rgb(242, 242, 247)",
    card: "rgb(255, 255, 255)",
    text: "rgb(0, 0, 0)",
    border: "rgb(198, 198, 200)",
    notification: "rgb(255, 59, 48)",
  },
};

const CustomDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    primary: 'rgb(74, 158, 255)',
    background: 'rgb(13, 13, 15)',
    card: 'rgb(22, 22, 24)',
    text: 'rgb(240, 240, 242)',
    border: 'rgba(255,255,255,0.07)',
    notification: 'rgb(255, 69, 58)',
  },
};

function AppContent() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      setOnboardingComplete(complete);
    });
  }, [pathname]);

  const { colorScheme } = useThemeContext();
  const navTheme = colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme;
  const statusStyle = colorScheme === "dark" ? "light" : "dark";

  return (
    <NotificationProvider>
  <SubscriptionProvider>
          <SubscriptionRedirect />
      <StatusBar style={statusStyle} animated />
      <NavThemeProvider value={navTheme}>
        <SafeAreaProvider>
          <WidgetProvider>
            <StopwatchProvider>
              <CategoryProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  {onboardingComplete === false && pathname !== "/auth" && pathname !== "/paywall" && pathname !== "/auth-popup" && pathname !== "/auth-callback" && <Redirect href="/onboarding" />}

                  <Stack>
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />

                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="stopwatch-modal"
                      options={{
                        presentation: "modal",
                        headerShown: false,
                      }}
                    />

                    <Stack.Screen
                      name="timer-modal"
                      options={{ presentation: "modal", headerShown: false }}
                    />
                    <Stack.Screen
                      name="goal-modal"
                      options={{ presentation: "modal", headerShown: false }}
                    />
                    <Stack.Screen
                      name="paywall"
                      options={{ headerShown: false, presentation: "modal" }}
                    />
                    <Stack.Screen
                      name="settings"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="routine-modal"
                      options={{
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="session-complete"
                      options={{
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="plan-session-modal"
                      options={{
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="notification-preferences"
                      options={{
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                  </Stack>
                  <SystemBars style={"auto"} />
                </GestureHandlerRootView>
              </CategoryProvider>
            </StopwatchProvider>
          </WidgetProvider>
        </SafeAreaProvider>
      </NavThemeProvider>
    </SubscriptionProvider>
    </NotificationProvider>
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const onOnboarding = pathname.startsWith("/onboarding");
    if (onOnboarding) return;

    let cancelled = false;
    isOnboardingComplete().then((done) => {
      if (cancelled) return;
      if (!done) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall");
      }
    }).catch(() => {
      if (cancelled) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall");
      }
    });
    return () => { cancelled = true; };
  }, [isSubscribed, loading, pathname]);

  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
