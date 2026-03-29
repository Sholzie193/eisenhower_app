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
        style={[styles.orb, { backgroundColor: theme.colors.accentWash, top: 96, right: -40 }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.topHalo,
          { backgroundColor: theme.colors.highlight, opacity: theme.mode === "dark" ? 0.18 : 0.38 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          { backgroundColor: theme.colors.highlight, bottom: 140, left: -70, width: 220, height: 220 },
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
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  orb: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
  },
  topHalo: {
    width: 340,
    height: 160,
    top: -48,
    left: "18%",
  },
});
