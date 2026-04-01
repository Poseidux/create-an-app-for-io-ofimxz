import * as React from 'react';
import { createContext, useCallback, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WidgetContextType = {
  refreshWidget: () => void;
  pushWidgetData: (data: WidgetData) => Promise<void>;
};

export interface WidgetData {
  todaySessions: number;
  todayTimeMs: number;
  activeGoalName?: string;
  activeGoalProgress?: number; // 0–1
  lastSessionName?: string;
  lastSessionMs?: number;
  streak: number;
  updatedAt: string;
}

const WIDGET_DATA_KEY = '@chroniqo_widget_data';

const WidgetContext = createContext<WidgetContextType | null>(null);

function reloadNativeWidget() {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ExtensionStorage } = require('@bacons/apple-targets');
    ExtensionStorage.reloadWidget();
  } catch {
    // not available — skip silently
  }
}

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    reloadNativeWidget();
  }, []);

  const pushWidgetData = useCallback(async (data: WidgetData) => {
    console.log('[WidgetContext] pushWidgetData called', data);
    try {
      await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
      // Also try to write to ExtensionStorage for iOS widget access
      if (Platform.OS === 'ios') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { ExtensionStorage } = require('@bacons/apple-targets');
          await ExtensionStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
          ExtensionStorage.reloadWidget();
        } catch {
          // not available — skip silently
        }
      }
    } catch {}
  }, []);

  const refreshWidget = useCallback(() => {
    console.log('[WidgetContext] refreshWidget called');
    reloadNativeWidget();
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget, pushWidgetData }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    // Return no-op fallback to prevent crashes
    return {
      refreshWidget: () => {},
      pushWidgetData: async () => {},
    };
  }
  return context;
};
