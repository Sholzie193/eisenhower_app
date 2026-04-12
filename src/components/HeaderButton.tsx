import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { getPressedShadow, getRaisedShadow } from "../theme/shadows";
import { triggerSelectionHaptic } from "../utils/haptics";

interface HeaderButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export const HeaderButton = ({ label, icon, onPress }: HeaderButtonProps) => {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        triggerSelectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        pressed ? getPressedShadow(theme) : getRaisedShadow(theme, 1),
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.stroke,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
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
      <View pointerEvents="none" style={[styles.shine, { backgroundColor: theme.colors.highlight }]} />
      <Ionicons name={icon} size={16} color={theme.colors.text} />
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 16,
    borderRadius: 999,
    opacity: 0.75,
  },
  label: {
    fontSize: 13,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.1,
  },
});
