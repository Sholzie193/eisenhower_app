import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { QUADRANT_META } from "../constants/quadrants";
import { useAppTheme } from "../providers/theme-provider";
import type { Quadrant } from "../types/decision";

interface QuadrantPillProps {
  quadrant: Quadrant;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const QuadrantPill = ({ quadrant, compact = false, style }: QuadrantPillProps) => {
  const { theme } = useAppTheme();
  const colors = theme.quadrants[quadrant];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.tint,
          paddingHorizontal: compact ? 10 : 12,
          minHeight: compact ? 26 : 30,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.solid }]}>{QUADRANT_META[quadrant].label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  text: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.15,
  },
});
