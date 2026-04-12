import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { getPressedShadow, getRaisedShadow } from "../theme/shadows";
import { triggerImpactHaptic } from "../utils/haptics";
import * as Haptics from "expo-haptics";

interface NeuButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
}

export const NeuButton = ({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: NeuButtonProps) => {
  const { theme } = useAppTheme();
  const impactStyle =
    variant === "primary" || variant === "danger"
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light;
  const gradientColors: readonly [string, string] =
    variant === "primary"
      ? [theme.colors.accent, theme.colors.accentStrong]
      : variant === "danger"
        ? ["#DD8B96", theme.colors.danger]
        : variant === "secondary"
          ? [theme.colors.surfaceElevated, theme.colors.surface]
          : ["transparent", "transparent"];
  const labelColor =
    variant === "primary" || variant === "danger" ? theme.colors.onAccent : theme.colors.text;

  return (
    <Pressable
      onPress={() => {
        if (disabled) {
          return;
        }

        triggerImpactHaptic(impactStyle);
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant !== "ghost" && (pressed ? getPressedShadow(theme) : getRaisedShadow(theme, 1.1)),
        {
          backgroundColor: variant === "ghost" ? "transparent" : theme.colors.surface,
          borderColor: variant === "ghost" ? "transparent" : theme.colors.stroke,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }, { translateY: pressed ? 1 : 0 }],
        },
      ]}
    >
      {variant === "ghost" ? null : (
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      )}
      <View
        pointerEvents="none"
        style={[
          styles.shine,
          {
            backgroundColor:
              variant === "primary" || variant === "danger" ? "rgba(255,255,255,0.16)" : theme.colors.highlight,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.depth,
          {
            backgroundColor:
              variant === "primary" || variant === "danger"
                ? "rgba(255,255,255,0.1)"
                : theme.colors.accentWash,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          { color: labelColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.2,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 20,
    borderRadius: 999,
    opacity: 0.75,
  },
  depth: {
    position: "absolute",
    right: -18,
    bottom: -22,
    width: 88,
    height: 88,
    borderRadius: 999,
    opacity: 0.45,
  },
});
