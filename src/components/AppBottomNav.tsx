import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppData } from "../providers/app-provider";
import { useAppTheme } from "../providers/theme-provider";
import { getRaisedShadow } from "../theme/shadows";
import { triggerSelectionHaptic } from "../utils/haptics";

export const APP_BOTTOM_NAV_HEIGHT = 78;
export const APP_BOTTOM_NAV_MARGIN = 8;

type NavKey = "dashboard" | "capture" | "triage" | "result";

interface NavItem {
  key: NavKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
  onPress: () => void;
}

const getActiveKey = (pathname: string): NavKey => {
  if (pathname === "/add" || pathname.endsWith("/edit")) {
    return "capture";
  }

  if (pathname === "/triage") {
    return "triage";
  }

  if (pathname === "/result") {
    return "result";
  }

  return "dashboard";
};

export const AppBottomNav = () => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { draft, startDraft } = useAppData();
  const { theme } = useAppTheme();

  const activeKey = getActiveKey(pathname);
  const hasDraft = Boolean(draft);

  const items: NavItem[] = [
    {
      key: "dashboard",
      label: "Home",
      icon: "grid-outline",
      enabled: true,
      onPress: () => router.navigate("/"),
    },
    {
      key: "capture",
      label: "Capture",
      icon: "add-circle-outline",
      enabled: true,
      onPress: () => {
        if (!draft || pathname.startsWith("/item/")) {
          startDraft();
        }
        router.navigate("/add");
      },
    },
    {
      key: "triage",
      label: "Triage",
      icon: "swap-horizontal-outline",
      enabled: hasDraft,
      onPress: () => router.navigate("/triage"),
    },
    {
      key: "result",
      label: "Result",
      icon: "navigate-outline",
      enabled: hasDraft,
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
        <View
          pointerEvents="none"
        style={[
          styles.backdrop,
          {
            backgroundColor: "rgba(20, 26, 34, 0.96)",
          },
        ]}
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
                  transform: [{ translateY: pressed ? 1 : 0 }],
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
    minHeight: APP_BOTTOM_NAV_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    padding: 7,
    flexDirection: "row",
    gap: 6,
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
    height: 56,
    borderRadius: 999,
    opacity: 0.6,
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
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.15,
  },
});
