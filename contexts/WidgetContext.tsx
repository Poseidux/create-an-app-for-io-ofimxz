import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (Platform.OS !== "ios") return;
    // Only attempt widget refresh on native iOS builds
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ExtensionStorage } = require("@bacons/apple-targets");
      ExtensionStorage.reloadWidget();
    } catch {
      // @bacons/apple-targets not available in this environment — skip silently
    }
  }, []);

  const refreshWidget = useCallback(() => {
    if (Platform.OS !== "ios") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ExtensionStorage } = require("@bacons/apple-targets");
      ExtensionStorage.reloadWidget();
    } catch {
      // not available — skip silently
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
