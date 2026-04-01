import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";

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
  const { colorScheme } = useThemeContext();
  const navTheme = colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme;
  const statusStyle = colorScheme === "dark" ? "light" : "dark";

  return (
    <SubscriptionProvider>
      <StatusBar style={statusStyle} animated />
      <NavThemeProvider value={navTheme}>
        <SafeAreaProvider>
          <WidgetProvider>
            <StopwatchProvider>
              <CategoryProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <Stack>
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
                  </Stack>
                  <SystemBars style={"auto"} />
                </GestureHandlerRootView>
              </CategoryProvider>
            </StopwatchProvider>
          </WidgetProvider>
        </SafeAreaProvider>
      </NavThemeProvider>
    </SubscriptionProvider>
  );
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

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
