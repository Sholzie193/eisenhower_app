import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { getRaisedShadow } from "../theme/shadows";
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
        variant !== "ghost" && getRaisedShadow(theme, pressed ? 0.7 : 1.1),
        {
          backgroundColor:
            variant === "primary"
              ? theme.colors.accentStrong
              : variant === "danger"
                ? theme.colors.danger
                : variant === "ghost"
                  ? "transparent"
                  : theme.colors.surface,
          borderColor: variant === "ghost" ? "transparent" : theme.colors.stroke,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.shine,
          { backgroundColor: variant === "primary" || variant === "danger" ? "rgba(255,255,255,0.16)" : theme.colors.highlight },
        ]}
      />
      <Text
        style={[
          styles.label,
          {
            color:
              variant === "primary" || variant === "danger"
                ? "#11161C"
                : theme.colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  label: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.1,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
