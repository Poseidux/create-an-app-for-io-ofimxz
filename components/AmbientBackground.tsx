import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Primary Orb ─────────────────────────────────────────────────────────────
// Each orb animates: opacity (fade), translateY (drift), scale (pulse)
// All use useNativeDriver: true (transform + opacity only)

function Orb({
  color,
  size,
  top,
  left,
  delay,
  driftDuration,
  pulseDuration,
  fadeDuration,
}: {
  color: string;
  size: number;
  top: number | string;
  left: number | string;
  delay: number;
  driftDuration: number;
  pulseDuration: number;
  fadeDuration: number;
}) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Fade loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: fadeDuration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: fadeDuration,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Drift loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -14,
          duration: driftDuration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: driftDuration,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Scale pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: pulseDuration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.85,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
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
        transform: [{ translateY }, { scale }],
      }}
    />
  );
}

// ─── Accent Orb (smaller, no scale — keeps total animated values low) ─────────

function AccentOrb({
  color,
  size,
  top,
  left,
  delay,
  driftDuration,
}: {
  color: string;
  size: number;
  top: number | string;
  left: number | string;
  delay: number;
  driftDuration: number;
}) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: driftDuration * 0.7,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.1,
          duration: driftDuration * 0.7,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 18,
          duration: driftDuration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -10,
          duration: driftDuration,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration: driftDuration * 1.2,
          delay: delay + 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: driftDuration * 1.2,
          useNativeDriver: true,
        }),
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
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

// ─── Hero Spotlight ───────────────────────────────────────────────────────────
// A large, very soft radial-looking glow centered in the upper area.
// Implemented as a blurred View — no animated values needed.

function HeroSpotlight() {
  const spotSize = SCREEN_WIDTH * 1.1;
  return (
    <View
      style={{
        position: 'absolute',
        top: -spotSize * 0.35,
        left: (SCREEN_WIDTH - spotSize) / 2,
        width: spotSize,
        height: spotSize,
        borderRadius: spotSize / 2,
        // Primary accent at ~5% opacity — very subtle spotlight
        backgroundColor: 'rgba(0,212,255,0.05)',
      }}
      pointerEvents="none"
    />
  );
}

// ─── AmbientBackground ────────────────────────────────────────────────────────

export function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Hero spotlight — upper-center radial glow */}
      <HeroSpotlight />

      {/* ── Primary orbs (5 large, staggered) ── */}
      <Orb
        color="rgba(0,212,255,0.09)"
        size={370}
        top={-80}
        left={-100}
        delay={0}
        driftDuration={9000}
        pulseDuration={11000}
        fadeDuration={5000}
      />
      <Orb
        color="rgba(0,255,148,0.06)"
        size={280}
        top={60}
        left="55%"
        delay={800}
        driftDuration={11000}
        pulseDuration={13000}
        fadeDuration={6000}
      />
      <Orb
        color="rgba(0,212,255,0.05)"
        size={420}
        top="30%"
        left="15%"
        delay={1600}
        driftDuration={13000}
        pulseDuration={10000}
        fadeDuration={7000}
      />
      <Orb
        color="rgba(0,255,148,0.07)"
        size={310}
        top="60%"
        left={-60}
        delay={2400}
        driftDuration={10000}
        pulseDuration={12000}
        fadeDuration={5500}
      />
      <Orb
        color="rgba(0,212,255,0.06)"
        size={260}
        top="75%"
        left="60%"
        delay={3200}
        driftDuration={12000}
        pulseDuration={14000}
        fadeDuration={6500}
      />
      <Orb
        color="rgba(0,180,255,0.04)"
        size={340}
        top="45%"
        left="70%"
        delay={1200}
        driftDuration={14000}
        pulseDuration={9000}
        fadeDuration={8000}
      />

      {/* ── Accent orbs (3 small, steel-blue/cyan tint) ── */}
      <AccentOrb
        color="rgba(56,189,248,0.12)"
        size={72}
        top="20%"
        left="75%"
        delay={500}
        driftDuration={8000}
      />
      <AccentOrb
        color="rgba(99,179,237,0.10)"
        size={60}
        top="55%"
        left="30%"
        delay={2000}
        driftDuration={10000}
      />
      <AccentOrb
        color="rgba(0,212,255,0.11)"
        size={80}
        top="85%"
        left="50%"
        delay={3500}
        driftDuration={9500}
      />
    </View>
  );
}
