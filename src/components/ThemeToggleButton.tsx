import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { getRaisedShadow } from "../theme/shadows";
import { triggerSelectionHaptic } from "../utils/haptics";

export const ThemeToggleButton = () => {
  const { theme, isDark, toggleTheme } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        toggleTheme();
      }}
      style={({ pressed }) => [
        styles.button,
        getRaisedShadow(theme, pressed ? 0.7 : 1.05),
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.stroke,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[theme.colors.surfaceElevated, theme.colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Ionicons
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={18}
        color={theme.colors.text}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
