import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppData } from "../providers/app-provider";
import { useAppTheme } from "../providers/theme-provider";
import { getRaisedShadow } from "../theme/shadows";
import { triggerSelectionHaptic } from "../utils/haptics";

export const APP_BOTTOM_NAV_HEIGHT = 82;
export const APP_BOTTOM_NAV_MARGIN = 8;

type NavKey = "clarity" | "manual" | "result";

interface NavItem {
  key: NavKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
  onPress: () => void;
}

const getActiveKey = (pathname: string): NavKey => {
  if (pathname === "/add" || pathname === "/triage" || pathname.endsWith("/edit")) {
    return "manual";
  }

  if (pathname === "/result") {
    return "result";
  }

  return "clarity";
};

export const AppBottomNav = () => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { claritySession, draft, startDraft } = useAppData();
  const { theme } = useAppTheme();

  const activeKey = getActiveKey(pathname);
  const hasResult = Boolean(draft || claritySession);

  const items: NavItem[] = [
    {
      key: "clarity",
      label: "Clarity",
      icon: "sparkles-outline",
      enabled: true,
      onPress: () => router.navigate("/"),
    },
    {
      key: "manual",
      label: "Manual",
      icon: "options-outline",
      enabled: true,
      onPress: () => {
        if (!draft || pathname.startsWith("/item/")) {
          startDraft();
        }
        router.navigate("/add");
      },
    },
    {
      key: "result",
      label: "Read",
      icon: "compass-outline",
      enabled: hasResult,
      onPress: () => router.navigate("/result"),
    },
  ];

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 8) + APP_BOTTOM_NAV_MARGIN,
        },
      ]}
    >
      <View
        style={[
          styles.shell,
          getRaisedShadow(theme, 1.3),
          {
            borderColor: theme.colors.stroke,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.halo, { backgroundColor: theme.colors.accentWash }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={
            theme.mode === "dark"
              ? ["rgba(24, 34, 46, 0.96)", "rgba(13, 20, 28, 0.94)"]
              : ["rgba(251, 253, 255, 0.96)", "rgba(229, 237, 245, 0.94)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backdrop}
        />
        <View
          pointerEvents="none"
          style={[styles.shine, { backgroundColor: theme.colors.highlight }]}
        />
        {items.map((item) => {
          const active = item.key === activeKey;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: !item.enabled }}
              disabled={!item.enabled}
              onPress={() => {
                triggerSelectionHaptic();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: active ? theme.colors.surfaceElevated : "transparent",
                  borderColor: active ? theme.colors.stroke : "transparent",
                  opacity: item.enabled ? (pressed ? 0.82 : 1) : 0.42,
                  transform: [{ translateY: pressed ? 1 : 0 }, { scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? theme.colors.accentStrong : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? theme.colors.text : theme.colors.textMuted,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  shell: {
    minHeight: 82,
    borderRadius: 30,
    borderWidth: 1,
    padding: 8,
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  halo: {
    position: "absolute",
    top: -18,
    left: "22%",
    right: "22%",
    height: 68,
    borderRadius: 999,
    opacity: 0.75,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  item: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.2,
  },
});
