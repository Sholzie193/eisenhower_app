import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import { getInsetBorder, getRaisedShadow } from "../theme/shadows";
import type { PropsWithChildren } from "react";

interface NeuCardProps extends PropsWithChildren {
  variant?: "raised" | "inset" | "flat";
  style?: StyleProp<ViewStyle>;
}

export const NeuCard = ({ children, variant = "raised", style }: NeuCardProps) => {
  const { theme } = useAppTheme();

  const cardStyle =
    variant === "raised"
      ? [
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.stroke,
          },
          getRaisedShadow(theme, 1.2),
        ]
      : variant === "inset"
        ? [getInsetBorder(theme)]
        : [
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.stroke,
            },
          ];

  return (
    <View style={[styles.outer, cardStyle, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            backgroundColor: theme.colors.highlight,
            opacity: variant === "raised" ? 1 : theme.mode === "dark" ? 0.45 : 0.8,
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
