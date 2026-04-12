import type { ViewStyle } from "react-native";
import type { AppTheme } from "./tokens";

export const getRaisedShadow = (theme: AppTheme, depth = 1): ViewStyle => ({
  shadowColor: theme.colors.shadowDark,
  shadowOffset: { width: 0, height: depth * 10 },
  shadowOpacity: theme.mode === "dark" ? 0.34 : 0.16,
  shadowRadius: depth * 20,
  elevation: Math.round(depth * 5),
});

export const getInsetBorder = (theme: AppTheme): ViewStyle => ({
  borderWidth: 1,
  borderColor: theme.colors.stroke,
  backgroundColor: theme.colors.surfaceInset,
});

export const getPressedShadow = (theme: AppTheme): ViewStyle => ({
  shadowColor: theme.colors.shadowDark,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: theme.mode === "dark" ? 0.22 : 0.12,
  shadowRadius: 10,
  elevation: 1,
});
