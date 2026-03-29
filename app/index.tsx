import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_BOTTOM_NAV_HEIGHT, APP_BOTTOM_NAV_MARGIN } from "../src/components/AppBottomNav";
import { ScreenShell } from "../src/components/ScreenShell";
import { NeuCard } from "../src/components/NeuCard";
import { NeuButton } from "../src/components/NeuButton";
import { ItemCard } from "../src/components/ItemCard";
import { QUADRANT_META, QUADRANT_ORDER } from "../src/constants/quadrants";
import { sortItemsByPriority } from "../src/logic/priority";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";
import type { Quadrant } from "../src/types/decision";

type FilterValue = "all" | Quadrant;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Now", value: "doNow" },
  { label: "Plan", value: "schedule" },
  { label: "Reduce", value: "delegate" },
  { label: "Drop", value: "eliminate" },
];

export default function DashboardScreen() {
  const { hydrated, items, startDraft } = useAppData();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterValue>("all");

  const activeItems = useMemo(
    () => sortItemsByPriority(items.filter((item) => !item.completed)),
    [items]
  );
  const completedItems = items.filter((item) => item.completed).length;
  const doNowItems = activeItems.filter((item) => item.quadrant === "doNow");
  const scheduleItems = activeItems.filter((item) => item.quadrant === "schedule");

  const filteredItems = activeItems.filter((item) => filter === "all" || item.quadrant === filter);
  const topMessage = doNowItems.length
    ? `${doNowItems.length} ${doNowItems.length === 1 ? "item needs" : "items need"} action now.`
    : scheduleItems.length
      ? "Nothing urgent. Protect the next important step."
      : activeItems.length
        ? "No immediate pressure. Keep the board clean."
        : "Capture the next decision and place it fast.";

  if (!hydrated) {
    return (
      <ScreenShell scroll={false} contentStyle={styles.centered}>
        <ActivityIndicator color={theme.colors.accentStrong} />
      </ScreenShell>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenShell contentStyle={styles.dashboardContent}>
        <View style={styles.headerBlock}>
          <Text style={[styles.eyebrow, { color: theme.colors.textSoft }]}>Decision board</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Know what to do next.</Text>
            <View style={[styles.badge, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.stroke }]}>
              <Text style={[styles.badgeValue, { color: theme.colors.text }]}>{activeItems.length}</Text>
              <Text style={[styles.badgeLabel, { color: theme.colors.textSoft }]}>open</Text>
            </View>
          </View>
        </View>

        <NeuCard style={styles.commandCard}>
          <View style={styles.commandTop}>
            <View style={styles.commandCopy}>
              <Text style={[styles.commandTitle, { color: theme.colors.text }]}>{topMessage}</Text>
              <Text style={[styles.commandText, { color: theme.colors.textMuted }]}>
                Capture fast, then let the matrix call the next move.
              </Text>
            </View>
            <Pressable
              onPress={() => setFilter("doNow")}
              style={[styles.inlinePill, { backgroundColor: theme.colors.accentWash }]}
            >
              <Text style={[styles.inlinePillText, { color: theme.quadrants.doNow.solid }]}>
                {doNowItems.length} now
              </Text>
            </Pressable>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{doNowItems.length}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Need action</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{scheduleItems.length}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Planned next</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{completedItems}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Closed out</Text>
            </View>
          </View>

          <NeuButton
            label="Capture decision"
            onPress={() => {
              startDraft();
              router.push("/add");
            }}
          />
        </NeuCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Needs action now</Text>
            <Text style={[styles.sectionHint, { color: theme.colors.textSoft }]}>Start here</Text>
          </View>
          {doNowItems.length ? (
            <View style={styles.listColumn}>
              {doNowItems.slice(0, 3).map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />
              ))}
            </View>
          ) : (
            <NeuCard variant="flat">
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Nothing pressing.</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                That is the outcome you want from this board.
              </Text>
            </NeuCard>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Up next</Text>
            <Text style={[styles.sectionHint, { color: theme.colors.textSoft }]}>Worth handling soon</Text>
          </View>
          {scheduleItems.length ? (
            <View style={styles.listColumn}>
              {scheduleItems.slice(0, 3).map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />
              ))}
            </View>
          ) : (
            <NeuCard variant="flat">
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No planned items yet.</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                The next strong candidate will land here.
              </Text>
            </NeuCard>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quadrant overview</Text>
            <Text style={[styles.sectionHint, { color: theme.colors.textSoft }]}>Tap to filter</Text>
          </View>
          <View style={styles.overviewGrid}>
            {QUADRANT_ORDER.map((quadrant) => {
              const colors = theme.quadrants[quadrant];
              const count = activeItems.filter((item) => item.quadrant === quadrant).length;
              const active = filter === quadrant;
              return (
                <Pressable
                  key={quadrant}
                  onPress={() => setFilter(active ? "all" : quadrant)}
                  style={[
                    styles.overviewCard,
                    {
                      backgroundColor: active ? theme.colors.surfaceElevated : theme.colors.surface,
                      borderColor: active ? colors.solid : theme.colors.stroke,
                    },
                  ]}
                >
                  <View style={styles.overviewTop}>
                    <View style={[styles.overviewDot, { backgroundColor: colors.solid }]} />
                    <Text style={[styles.overviewCount, { color: theme.colors.text }]}>{count}</Text>
                  </View>
                  <Text style={[styles.overviewLabel, { color: theme.colors.text }]}>
                    {QUADRANT_META[quadrant].label}
                  </Text>
                  <Text style={[styles.overviewText, { color: theme.colors.textMuted }]}>
                    {QUADRANT_META[quadrant].recommendation}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Review list</Text>
            <Text style={[styles.sectionHint, { color: theme.colors.textSoft }]}>
              {filter === "all" ? "All open items" : QUADRANT_META[filter].label}
            </Text>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((entry) => {
              const active = entry.value === filter;
              return (
                <Pressable
                  key={entry.value}
                  onPress={() => setFilter(entry.value)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.colors.surfaceElevated : theme.colors.surfaceMuted,
                      borderColor: active ? theme.colors.accentStrong : theme.colors.stroke,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterLabel,
                      { color: active ? theme.colors.text : theme.colors.textMuted },
                    ]}
                  >
                    {entry.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredItems.length ? (
            <View style={styles.listColumn}>
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />
              ))}
            </View>
          ) : (
            <NeuCard variant="flat">
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Nothing in this lane.</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                Move on or capture the next real decision.
              </Text>
            </NeuCard>
          )}
        </View>
      </ScreenShell>

      <View
        style={[
          styles.ctaWrap,
          {
            bottom: APP_BOTTOM_NAV_HEIGHT + APP_BOTTOM_NAV_MARGIN + Math.max(insets.bottom, 8) + 8,
          },
        ]}
      >
        <NeuButton
          label="New item"
          onPress={() => {
            startDraft();
            router.push("/add");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardContent: {
    paddingBottom: 164,
    gap: 22,
  },
  headerBlock: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    flex: 1,
    fontSize: 32,
    lineHeight: 36,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  badge: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
  },
  badgeValue: {
    fontSize: 18,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_700Bold",
  },
  badgeLabel: {
    fontSize: 11,
    fontFamily: "IBMPlexSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  commandCard: {
    gap: 18,
    paddingVertical: 18,
  },
  commandTop: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  commandCopy: {
    flex: 1,
    gap: 6,
  },
  commandTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  commandText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
    maxWidth: 280,
  },
  inlinePill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  inlinePillText: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBlock: {
    flex: 1,
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "IBMPlexSans_700Bold",
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_500Medium",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  listColumn: {
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  overviewCard: {
    width: "48%",
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  overviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  overviewCount: {
    fontSize: 18,
    fontFamily: "IBMPlexSans_700Bold",
  },
  overviewLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  overviewText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_500Medium",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  ctaWrap: {
    position: "absolute",
    left: 20,
    right: 20,
  },
});
