import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "../providers/theme-provider";
import type { PropsWithChildren } from "react";
import { APP_BOTTOM_NAV_HEIGHT, APP_BOTTOM_NAV_MARGIN, AppBottomNav } from "./AppBottomNav";

interface ScreenShellProps extends PropsWithChildren {
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export const ScreenShell = ({ children, scroll = true, contentStyle }: ScreenShellProps) => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomClearance = APP_BOTTOM_NAV_HEIGHT + APP_BOTTOM_NAV_MARGIN + Math.max(insets.bottom, 8) + 24;

  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <View
        pointerEvents="none"
        style={[styles.orb, styles.primaryOrb, { backgroundColor: theme.colors.accentWash }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.topHalo,
          { backgroundColor: theme.colors.highlight, opacity: theme.mode === "dark" ? 0.16 : 0.34 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.secondaryOrb,
          { backgroundColor: theme.colors.highlight, opacity: theme.mode === "dark" ? 0.05 : 0.22 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.canvasPlate,
          {
            borderColor: theme.colors.stroke,
            backgroundColor:
              theme.mode === "dark" ? "rgba(15, 23, 32, 0.18)" : "rgba(255, 255, 255, 0.18)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.band,
          {
            backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.lowerBand,
          {
            backgroundColor:
              theme.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.28)",
          },
        ]}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }, contentStyle]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              removeClippedSubviews
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, styles.flex, { paddingBottom: bottomClearance }, contentStyle]}>
              {children}
            </View>
          )}
        </KeyboardAvoidingView>
        <AppBottomNav />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 20,
  },
  orb: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  primaryOrb: {
    top: 72,
    right: -40,
  },
  topHalo: {
    width: 360,
    height: 160,
    top: -58,
    left: "12%",
  },
  secondaryOrb: {
    bottom: 124,
    left: -92,
    width: 244,
    height: 244,
  },
  canvasPlate: {
    position: "absolute",
    top: 86,
    left: 14,
    right: 14,
    bottom: 118,
    borderRadius: 34,
    borderWidth: 1,
  },
  band: {
    position: "absolute",
    top: 112,
    left: 22,
    right: 22,
    height: 1,
    borderRadius: 999,
    opacity: 0.75,
  },
  lowerBand: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 126,
    height: 1,
    borderRadius: 999,
    opacity: 0.65,
  },
});
