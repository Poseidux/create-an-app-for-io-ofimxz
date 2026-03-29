import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_theme_preference';

type ThemePreference = 'system' | 'light' | 'dark';
type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  colorScheme: ColorScheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('dark');

  const setTheme = (newTheme: ThemePreference) => {
    console.log(`[ThemeContext] setTheme: ${newTheme}`);
    setThemeState(newTheme);
    AsyncStorage.setItem(STORAGE_KEY, newTheme);
  };

  // Always dark mode
  const colorScheme: ColorScheme = 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
