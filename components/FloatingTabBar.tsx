import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import { useTheme } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth / 2.5,
  borderRadius = 35,
  bottomMargin
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const animatedValue = useSharedValue(0);

  // Active tab detection using usePathname() from expo-router.
  // pathname examples on Android:
  //   "/"  or  "/(tabs)/(stopwatches)"  → index 0 (stopwatches, fallback)
  //   "/(tabs)/(history)"  or  "/(tabs)/(history)/abc123"  → history
  //   "/(tabs)/(stats)"  → stats
  //   "/(tabs)/(settings)"  → settings
  // We split the pathname into segments and check whether any segment
  // matches the tab's name (with or without parentheses), which is
  // more reliable than substring matching on the full path string.
  const activeTabIndex = React.useMemo(() => {
    // Split pathname into individual path segments, e.g.
    // "/(tabs)/(history)/abc" → ["", "(tabs)", "(history)", "abc"]
    const pathSegments = pathname.split('/');

    // For each tab, check if any path segment matches the tab name
    // either exactly ("(stopwatches)") or without parens ("stopwatches").
    let bestMatch = -1;
    let bestPriority = -1;

    tabs.forEach((tab, index) => {
      const nameWithParens = tab.name;                        // e.g. "(stopwatches)"
      const nameWithout = tab.name.replace(/[()]/g, '');     // e.g. "stopwatches"

      for (const seg of pathSegments) {
        if (seg === nameWithParens || seg === nameWithout) {
          // Exact segment match — highest priority
          if (2 > bestPriority) {
            bestPriority = 2;
            bestMatch = index;
          }
          break;
        }
        // Fallback: segment contains the bare name (handles edge cases like
        // Android returning a path without group parens)
        if (seg.includes(nameWithout) && nameWithout.length > bestPriority) {
          bestPriority = nameWithout.length;
          bestMatch = index;
        }
      }
    });

    // Default to index 0 (stopwatches) when pathname is "/" or no segment matched
    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  React.useEffect(() => {
    if (activeTabIndex >= 0) {
      animatedValue.value = withSpring(activeTabIndex, {
        damping: 20,
        stiffness: 120,
        mass: 1,
      });
    }
  }, [activeTabIndex, animatedValue]);

  const handleTabPress = (route: Href) => {
    router.push(route);
  };

  // Remove unnecessary tabBarStyle animation to prevent flickering

  const tabWidthPercent = ((100 / tabs.length) - 1).toFixed(2);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / tabs.length; // Account for container padding (4px on each side)
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, tabs.length - 1],
            [0, tabWidth * (tabs.length - 1)]
          ),
        },
      ],
    };
  });

  // Dynamic styles based on theme
  const dynamicStyles = {
    blurContainer: {
      ...styles.blurContainer,
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      ...Platform.select({
        ios: {
          backgroundColor: theme.dark
            ? 'rgba(17, 17, 19, 0.92)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        android: {
          backgroundColor: theme.dark
            ? 'rgba(17, 17, 19, 0.98)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        web: {
          backgroundColor: theme.dark
            ? 'rgba(17, 17, 19, 0.98)'
            : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
        },
      }),
    },
    background: {
      ...styles.background,
    },
    indicator: {
      ...styles.indicator,
      backgroundColor: theme.dark
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(0, 0, 0, 0.04)',
      width: `${tabWidthPercent}%` as `${number}%`,
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[
        styles.container,
        {
          width: containerWidth,
          marginBottom: bottomMargin ?? 20
        }
      ]}>
        <BlurView
          intensity={80}
          style={[dynamicStyles.blurContainer, { borderRadius }]}
        >
          <View style={dynamicStyles.background} />
          <Animated.View style={[dynamicStyles.indicator, indicatorStyle]} />
          <View style={styles.tabsContainer}>
            {tabs.map((tab, index) => {
              const isActive = activeTabIndex === index;

              return (
                <React.Fragment key={index}>
                <TouchableOpacity
                  key={index} // Use index as key
                  style={styles.tab}
                  onPress={() => handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  <View key={index} style={styles.tabContent}>
                    <IconSymbol
                      android_material_icon_name={tab.icon}
                      ios_icon_name={tab.icon}
                      size={24}
                      color={isActive ? theme.colors.primary : (theme.dark ? '#6B6B72' : '#000000')}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: theme.dark ? '#6B6B72' : '#8E8E93' },
                        isActive && { color: theme.colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center', // Center the content
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
    // width and marginBottom handled dynamically via props
  },
  blurContainer: {
    overflow: 'hidden',
    // borderRadius and other styling applied dynamically
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    // Dynamic styling applied in component
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 2,
    bottom: 4,
    borderRadius: 27,
    width: `${(100 / 2) - 1}%`, // Default for 2 tabs, will be overridden by dynamic styles
    // Dynamic styling applied in component
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    // Dynamic styling applied in component
  },
});
