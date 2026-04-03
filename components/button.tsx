import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useColors } from "@/constants/Colors";

type ButtonVariant = "primary" | "secondary" | "destructive" | "filled" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  children,
  style,
  textStyle,
}) => {
  const C = useColors();

  const sizeStyles: Record<ButtonSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
    sm: { height: 40, fontSize: 14, paddingHorizontal: 16 },
    md: { height: 48, fontSize: 16, paddingHorizontal: 20 },
    lg: { height: 56, fontSize: 17, paddingHorizontal: 24 },
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: sizeStyles[size].height,
      paddingHorizontal: sizeStyles[size].paddingHorizontal,
      opacity: disabled ? 0.5 : 1,
    };

    switch (variant) {
      case "primary":
      case "filled":
        return {
          ...base,
          backgroundColor: C.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        } as ViewStyle;
      case "secondary":
        return {
          ...base,
          backgroundColor: C.primaryMuted,
        };
      case "destructive":
        return {
          ...base,
          backgroundColor: C.danger,
          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        } as ViewStyle;
      case "outline":
        return {
          ...base,
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: C.border,
        };
      case "ghost":
        return {
          ...base,
          backgroundColor: "transparent",
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "primary":
      case "filled":
      case "destructive":
        return "#FFFFFF";
      case "secondary":
        return C.primary;
      case "outline":
      case "ghost":
        return C.primary;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
      scaleValue={0.97}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={StyleSheet.flatten([
            {
              fontSize: sizeStyles[size].fontSize,
              color: getTextColor(),
              textAlign: "center",
              fontWeight: "700",
              lineHeight: Math.round(sizeStyles[size].fontSize * 1.25),
            },
            textStyle,
          ])}
        >
          {children}
        </Text>
      )}
    </AnimatedPressable>
  );
};

export default Button;
