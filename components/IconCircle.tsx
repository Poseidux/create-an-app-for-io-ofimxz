import React from "react";
import { View, ViewStyle, Text } from "react-native";

interface IconCircleProps {
  emoji: string;
  backgroundColor?: string;
  size?: number;
  style?: ViewStyle;
}

export function IconCircle({
  emoji,
  backgroundColor = "lightblue",
  size = 48,
  style,
}: IconCircleProps) {
  return (
    <View
      style={[
        {
          backgroundColor,
          width: size,
          height: size,
          borderRadius: 12,
          // @ts-expect-error borderCurve is supported in Expo SDK 54
          borderCurve: 'continuous',
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
        style,
      ]}
    >
      {emoji ? <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text> : null}
    </View>
  );
}
