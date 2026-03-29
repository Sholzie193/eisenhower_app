import type { ViewStyle } from "react-native";
import type { AppTheme } from "./tokens";

export const getRaisedShadow = (theme: AppTheme, depth = 1): ViewStyle => ({
  shadowColor: theme.colors.shadowDark,
  shadowOffset: { width: 0, height: depth * 10 },
  shadowOpacity: theme.mode === "dark" ? 0.26 : 0.18,
  shadowRadius: depth * 14,
  elevation: depth * 3,
});

export const getInsetBorder = (theme: AppTheme): ViewStyle => ({
  borderWidth: 1,
  borderColor: theme.colors.stroke,
  backgroundColor: theme.colors.surfaceInset,
});
