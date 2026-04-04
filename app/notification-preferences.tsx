import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, BellOff } from 'lucide-react-native';
import { useColors } from '@/constants/Colors';
import { useNotifications } from '@/contexts/NotificationContext';
import { AmbientBackground } from '@/components/AmbientBackground';

const NOTIFICATION_CATEGORIES = [
  {
    key: 'updates',
    label: 'App Updates',
    description: 'New features and improvements',
    defaultEnabled: true,
  },
  {
    key: 'promotions',
    label: 'Promotions',
    description: 'Special offers and discounts',
    defaultEnabled: true,
  },
  {
    key: 'reminders',
    label: 'Reminders',
    description: 'Activity reminders and tips',
    defaultEnabled: true,
  },
];

export default function NotificationPreferencesScreen() {
  const C = useColors();
  const router = useRouter();
  const { hasPermission, permissionDenied, isWeb, requestPermission, sendTag, deleteTag } =
    useNotifications();

  const [categories, setCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(
      NOTIFICATION_CATEGORIES.map((cat) => [cat.key, cat.defaultEnabled])
    )
  );

  const handleEnableNotifications = async () => {
    console.log('[NotificationPreferences] Enable notifications pressed');
    if (permissionDenied) {
      Alert.alert(
        'Notifications Disabled',
        'To receive notifications, please enable them in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }
    await requestPermission();
  };

  const handleCategoryToggle = (key: string, value: boolean) => {
    console.log(`[NotificationPreferences] Category toggle: ${key} = ${value}`);
    setCategories((prev) => ({ ...prev, [key]: value }));
    if (value) {
      sendTag(`notify_${key}`, 'true');
    } else {
      deleteTag(`notify_${key}`);
    }
  };

  const sectionLabelStyle = {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 2.0,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 28,
    lineHeight: 17,
  };

  const cardStyle = {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
  };

  if (isWeb) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <AmbientBackground />
        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: 8,
              height: 52,
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: C.divider,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 22,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <ChevronLeft size={24} color={C.primary} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: C.text, letterSpacing: -0.3 }}>
              Notifications
            </Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              Push notifications are available in the mobile app.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 8,
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: C.divider,
            backgroundColor: C.background,
          }}
        >
          <Pressable
            onPress={() => {
              console.log('[NotificationPreferences] Back pressed');
              router.back();
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ChevronLeft size={24} color={C.primary} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              fontWeight: '600',
              color: C.text,
              letterSpacing: -0.3,
              lineHeight: 22,
            }}
          >
            Notifications
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Permission Status */}
          <Text style={sectionLabelStyle}>Status</Text>
          <View style={cardStyle}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: hasPermission ? 'rgba(34,197,94,0.12)' : C.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {hasPermission ? (
                  <Bell size={20} color="#22c55e" />
                ) : (
                  <BellOff size={20} color={C.textSecondary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 21 }}>
                  {hasPermission ? 'Notifications Enabled' : 'Notifications Disabled'}
                </Text>
                <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>
                  {hasPermission
                    ? "You'll receive push notifications"
                    : 'Enable notifications to stay updated'}
                </Text>
              </View>
            </View>
            {!hasPermission && (
              <>
                <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 74 }} />
                <Pressable
                  onPress={handleEnableNotifications}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.primary, lineHeight: 21 }}>
                    Enable Notifications
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Notification Categories */}
          {hasPermission && (
            <>
              <Text style={sectionLabelStyle}>Notification Types</Text>
              <View style={cardStyle}>
                {NOTIFICATION_CATEGORIES.map((category, idx) => (
                  <View key={category.key}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        minHeight: 52,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: '500', color: C.text, lineHeight: 21 }}>
                          {category.label}
                        </Text>
                        <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>
                          {category.description}
                        </Text>
                      </View>
                      <Switch
                        value={categories[category.key]}
                        onValueChange={(value) => handleCategoryToggle(category.key, value)}
                        trackColor={{ false: C.border, true: C.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                    {idx < NOTIFICATION_CATEGORIES.length - 1 && (
                      <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 16 }} />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
