import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

function Orb({ color, size, top, left, delay }: {
  color: string; size: number; top: number | string; left: number | string; delay: number;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 4000 + delay * 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 4000 + delay * 500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -12, duration: 6000 + delay * 800, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 6000 + delay * 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Orb color="rgba(0,212,255,0.08)" size={280} top={-60} left={-80} delay={0} />
      <Orb color="rgba(0,255,148,0.05)" size={200} top={40} left="60%" delay={1} />
      <Orb color="rgba(0,212,255,0.04)" size={320} top="35%" left="20%" delay={2} />
      <Orb color="rgba(0,255,148,0.06)" size={240} top="65%" left={-40} delay={3} />
    </View>
  );
}
