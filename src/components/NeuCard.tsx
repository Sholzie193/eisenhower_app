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
  const highlightOpacity =
    variant === "inset" ? (theme.mode === "dark" ? 0.14 : 0.48) : theme.mode === "dark" ? 0.16 : 0.62;
  const cornerOpacity =
    variant === "inset" ? (theme.mode === "dark" ? 0.04 : 0.12) : theme.mode === "dark" ? 0.08 : 0.2;
  const shadowOpacity = variant === "inset" ? 0.18 : theme.mode === "dark" ? 0.3 : 0.42;

  return (
    <View style={[styles.outer, cardStyle, style]}>
      <View
        pointerEvents="none"
        style={[styles.edgeRing, { borderColor: theme.colors.highlight, opacity: theme.mode === "dark" ? 0.06 : 0.3 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glowTop, { backgroundColor: theme.colors.highlight, opacity: highlightOpacity }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowCorner,
          {
            backgroundColor: theme.colors.highlight,
            opacity: cornerOpacity,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.shadowCorner,
          {
            backgroundColor: theme.colors.accentWash,
            opacity: shadowOpacity,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bottomShade,
          {
            backgroundColor: theme.mode === "dark" ? "rgba(0,0,0,0.16)" : "rgba(53, 94, 136, 0.04)",
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  edgeRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 30,
  },
  glowTop: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 20,
    borderRadius: 999,
  },
  glowCorner: {
    position: "absolute",
    top: -22,
    left: -14,
    width: 124,
    height: 124,
    borderRadius: 999,
  },
  shadowCorner: {
    position: "absolute",
    bottom: -34,
    right: -18,
    width: 134,
    height: 134,
    borderRadius: 999,
  },
  bottomShade: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 0,
    height: 22,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    opacity: 0.8,
  },
});
