/**
 * NotificationContext — native implementation.
 *
 * Manages local notification permission state using expo-notifications.
 * No remote push / OneSignal dependency.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const isWeb = Platform.OS === "web";

interface NotificationContextType {
  hasPermission: boolean;
  permissionDenied: boolean;
  loading: boolean;
  isWeb: boolean;
  requestPermission: () => Promise<boolean>;
  sendTag: (key: string, value: string) => void;
  deleteTag: (key: string) => void;
  lastNotification: Record<string, unknown> | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (isWeb) {
      setLoading(false);
      return;
    }

    let subscription: Notifications.Subscription | null = null;

    async function init() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const granted = status === "granted";
        setHasPermission(granted);
        setPermissionDenied(status === "denied");

        subscription = Notifications.addNotificationReceivedListener((notification) => {
          setLastNotification({
            title: notification.request.content.title ?? undefined,
            body: notification.request.content.body ?? undefined,
            data: notification.request.content.data,
          });
        });
      } catch (error) {
        console.error("[NotificationContext] Failed to initialize:", error);
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isWeb) return false;
    try {
      console.log("[NotificationContext] Requesting notification permission");
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);
      setPermissionDenied(!granted);
      console.log(`[NotificationContext] Permission result: ${status}`);
      return granted;
    } catch (error) {
      console.error("[NotificationContext] Permission request failed:", error);
      return false;
    }
  }, []);

  // sendTag / deleteTag are no-ops without OneSignal — kept for API compatibility
  const sendTag = useCallback((_key: string, _value: string) => {}, []);
  const deleteTag = useCallback((_key: string) => {}, []);

  return (
    <NotificationContext.Provider
      value={{
        hasPermission,
        permissionDenied,
        loading,
        isWeb,
        requestPermission,
        sendTag,
        deleteTag,
        lastNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
