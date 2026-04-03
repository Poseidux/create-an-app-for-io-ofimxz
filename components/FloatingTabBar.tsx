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
import { useColors } from '@/constants/Colors';

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
  bottomMargin,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const C = useColors();
  const animatedValue = useSharedValue(0);

  const activeTabIndex = React.useMemo(() => {
    const pathSegments = pathname.split('/');
    let bestMatch = -1;
    let bestPriority = -1;

    tabs.forEach((tab, index) => {
      const nameWithParens = tab.name;
      const nameWithout = tab.name.replace(/[()]/g, '');

      for (const seg of pathSegments) {
        if (seg === nameWithParens || seg === nameWithout) {
          if (2 > bestPriority) {
            bestPriority = 2;
            bestMatch = index;
          }
          break;
        }
        if (seg.includes(nameWithout) && nameWithout.length > bestPriority) {
          bestPriority = nameWithout.length;
          bestMatch = index;
        }
      }
    });

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

  const handleTabPress = (route: Href, label: string) => {
    console.log(`[FloatingTabBar] Tab pressed: ${label}`);
    router.push(route);
  };

  const tabWidthPercent = ((100 / tabs.length) - 1).toFixed(2);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / tabs.length;
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

  const blurContainerStyle = {
    ...styles.blurContainer,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
    ...Platform.select({
      ios: {
        backgroundColor: theme.dark
          ? 'rgba(28, 30, 38, 0.94)'
          : 'rgba(255, 255, 255, 0.72)',
      },
      android: {
        backgroundColor: theme.dark
          ? 'rgba(28, 30, 38, 0.99)'
          : 'rgba(255, 255, 255, 0.99)',
      },
      web: {
        backgroundColor: theme.dark
          ? 'rgba(28, 30, 38, 0.99)'
          : 'rgba(255, 255, 255, 0.99)',
        backdropFilter: 'blur(12px)',
      },
    }),
  };

  const indicatorDynamicStyle = {
    ...styles.indicator,
    backgroundColor: theme.dark
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(0, 0, 0, 0.05)',
    width: `${tabWidthPercent}%` as `${number}%`,
  };

  const activeColor = C.primary;
  const inactiveColor = C.textSecondary;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View
        style={[
          styles.container,
          {
            width: containerWidth,
            marginBottom: bottomMargin ?? 20,
          },
        ]}
      >
        <BlurView
          intensity={80}
          style={[blurContainerStyle, { borderRadius }]}
        >
          <View style={styles.background} />
          <Animated.View style={[indicatorDynamicStyle, indicatorStyle]} />
          <View style={styles.tabsContainer}>
            {tabs.map((tab, index) => {
              const isActive = activeTabIndex === index;

              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handleTabPress(tab.route, tab.label)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tabContent}>
                      <IconSymbol
                        android_material_icon_name={tab.icon}
                        ios_icon_name={tab.icon}
                        size={22}
                        color={isActive ? activeColor : inactiveColor}
                      />
                      <Text
                        style={[
                          styles.tabLabel,
                          { color: inactiveColor },
                          isActive && { color: activeColor, fontWeight: '600' },
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
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 2,
    bottom: 4,
    borderRadius: 27,
    width: `${(100 / 2) - 1}%`,
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
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
    lineHeight: 13,
  },
});
