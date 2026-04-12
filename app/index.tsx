import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { ScreenShell } from "../src/components/ScreenShell";
import { NeuCard } from "../src/components/NeuCard";
import { NeuButton } from "../src/components/NeuButton";
import { ItemCard } from "../src/components/ItemCard";
import { ThemeToggleButton } from "../src/components/ThemeToggleButton";
import { QUADRANT_META, QUADRANT_ORDER } from "../src/constants/quadrants";
import { sortItemsByPriority } from "../src/logic/priority";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";

const MIN_CLARITY_RUN_MS = 1200;
const RANKING_STAGE_DELAY_MS = 600;

const EXAMPLE_INPUTS = [
  "Need to call landlord",
  "Fix website, send outreach emails, and rest",
  "I don't know whether to finish the proposal, follow up a client, or handle admin",
];

const wait = (durationMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export default function HomeScreen() {
  const { hydrated, items, runClarity, startDraft } = useAppData();
  const { theme } = useAppTheme();
  const [input, setInput] = useState("");
  const [isRunningClarity, setIsRunningClarity] = useState(false);
  const [clarityStage, setClarityStage] = useState<"idle" | "extracting" | "ranking">("idle");

  const activeItems = useMemo(
    () => sortItemsByPriority(items.filter((item) => !item.completed)),
    [items]
  );
  const doNowCount = activeItems.filter((item) => item.quadrant === "doNow").length;
  const scheduleCount = activeItems.filter((item) => item.quadrant === "schedule").length;
  const delegateCount = activeItems.filter((item) => item.quadrant === "delegate").length;
  const eliminateCount = activeItems.filter((item) => item.quadrant === "eliminate").length;
  const quadrantCounts = {
    doNow: doNowCount,
    schedule: scheduleCount,
    delegate: delegateCount,
    eliminate: eliminateCount,
  } as const;

  const statusCopy = doNowCount
    ? `${doNowCount} saved ${doNowCount === 1 ? "decision still carries" : "decisions still carry"} pressure.`
    : scheduleCount
      ? "Your saved decisions look important, but not urgent."
      : activeItems.length
        ? "Nothing looks especially loud right now."
        : "Start with whatever feels most mentally present.";
  const inputMeta = input.trim() ? `${input.trim().length} chars` : "Scrolls when long";
  const clarityButtonLabel =
    clarityStage === "extracting"
      ? "Separating the real tasks..."
      : clarityStage === "ranking"
        ? "Ranking the board..."
        : "Find the clearest move";
  const helperCopy =
    clarityStage === "extracting"
      ? "AI cleanup is pulling out the real tasks or choices first."
      : clarityStage === "ranking"
        ? "The app is ranking the cleaned board against your decision rules."
        : "Long prompts stay inside this panel. Just write it plainly.";
  const helperMeta =
    clarityStage === "idle" ? "Phone-first capture" : "Clarity in progress";

  if (!hydrated) {
    return (
      <ScreenShell scroll={false} contentStyle={styles.centered}>
        <ActivityIndicator color={theme.colors.accentStrong} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell contentStyle={styles.content}>
      <NeuCard style={styles.heroCard}>
        <LinearGradient
          pointerEvents="none"
          colors={
            theme.mode === "dark"
              ? ["rgba(90, 124, 157, 0.16)", "rgba(10, 16, 23, 0)"]
              : ["rgba(88, 122, 158, 0.16)", "rgba(250, 252, 254, 0)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        />
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderCopy}>
            <View
              style={[
                styles.heroBadge,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
              ]}
            >
              <Ionicons name="sparkles-outline" size={14} color={theme.colors.accentStrong} />
              <Text style={[styles.heroBadgeText, { color: theme.colors.text }]}>Decision Triage</Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>A calmer board for what matters next.</Text>
          </View>
          <ThemeToggleButton />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          One thing, a few competing things, or a messy thought. The app clears the board first, then ranks it.
        </Text>
        <View style={styles.heroStatsRow}>
          <View
            style={[
              styles.heroStatCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.heroStatLabel, { color: theme.colors.textSoft }]}>Workflow</Text>
            <Text style={[styles.heroStatValue, { color: theme.colors.text }]}>AI cleanup</Text>
            <Text style={[styles.heroStatMeta, { color: theme.colors.textMuted }]}>then matrix read</Text>
          </View>
          <View
            style={[
              styles.heroStatCard,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.heroStatLabel, { color: theme.colors.textSoft }]}>Board load</Text>
            <Text style={[styles.heroStatValue, { color: theme.colors.text }]}>{activeItems.length} active</Text>
            <Text style={[styles.heroStatMeta, { color: theme.colors.textMuted }]}>
              {doNowCount} loud right now
            </Text>
          </View>
        </View>
      </NeuCard>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Board shape</Text>
        <Text style={[styles.sectionHint, { color: theme.colors.textSoft }]}>Four lanes, one glance</Text>
      </View>

      <View style={styles.quadrantGrid}>
        {QUADRANT_ORDER.map((quadrant) => {
          const colors = theme.quadrants[quadrant];
          return (
            <View
              key={quadrant}
              style={[
                styles.quadrantCard,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.stroke,
                },
              ]}
            >
              <View style={[styles.quadrantAccent, { backgroundColor: colors.solid }]} />
              <Text style={[styles.quadrantCount, { color: theme.colors.text }]}>
                {quadrantCounts[quadrant]}
              </Text>
              <Text style={[styles.quadrantLabel, { color: colors.solid }]}>
                {QUADRANT_META[quadrant].shortLabel}
              </Text>
              <Text style={[styles.quadrantMeta, { color: theme.colors.textMuted }]}>
                {QUADRANT_META[quadrant].description}
              </Text>
            </View>
          );
        })}
      </View>

      <NeuCard style={styles.captureCard}>
        <View
          pointerEvents="none"
          style={[styles.captureGlow, { backgroundColor: theme.colors.accentWash }]}
        />
        <View style={styles.captureHeader}>
          <View style={styles.captureHeaderCopy}>
            <Text style={[styles.captureKicker, { color: theme.colors.textSoft }]}>Clarity workspace</Text>
            <Text style={[styles.captureTitle, { color: theme.colors.text }]}>Drop in the whole situation.</Text>
          </View>
          <View
            style={[
              styles.captureBadge,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.stroke,
              },
            ]}
          >
            <Text style={[styles.captureBadgeText, { color: theme.colors.textMuted }]}>{inputMeta}</Text>
          </View>
        </View>

        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: theme.colors.surfaceInset,
              borderColor: theme.colors.stroke,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.inputShellShine, { backgroundColor: theme.colors.highlight }]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.inputIconWrap,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
            ]}
          >
            <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.colors.accentStrong} />
          </View>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Need to call landlord, fix website, or maybe just rest."
            placeholderTextColor={theme.colors.textSoft}
            multiline
            scrollEnabled
            textAlignVertical="top"
            keyboardAppearance={theme.mode === "dark" ? "dark" : "light"}
            selectionColor={theme.colors.accentStrong}
            style={[
              styles.input,
              {
                color: theme.colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.helperRow}>
          <Text style={[styles.helper, { color: theme.colors.textSoft }]}>
            {helperCopy}
          </Text>
          <Text style={[styles.helperMeta, { color: theme.colors.textSoft }]}>{helperMeta}</Text>
        </View>

        <View style={styles.exampleWrap}>
          {EXAMPLE_INPUTS.map((example) => (
            <Pressable
              key={example}
              onPress={() => setInput(example)}
              style={[
                styles.exampleChip,
                { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.stroke },
              ]}
            >
              <Text style={[styles.exampleText, { color: theme.colors.textMuted }]}>{example}</Text>
            </Pressable>
          ))}
        </View>

        <NeuButton
          label={clarityButtonLabel}
          disabled={!input.trim() || isRunningClarity}
          onPress={() => {
            void (async () => {
              const startedAt = Date.now();
              let rankingStageTimer: ReturnType<typeof setTimeout> | null = null;
              setIsRunningClarity(true);
              setClarityStage("extracting");
              try {
                rankingStageTimer = setTimeout(() => {
                  setClarityStage("ranking");
                }, RANKING_STAGE_DELAY_MS);
                await runClarity(input);
                const elapsedMs = Date.now() - startedAt;
                if (elapsedMs < MIN_CLARITY_RUN_MS) {
                  await wait(MIN_CLARITY_RUN_MS - elapsedMs);
                }
                router.push("/result");
              } finally {
                if (rankingStageTimer) {
                  clearTimeout(rankingStageTimer);
                }
                setIsRunningClarity(false);
                setClarityStage("idle");
              }
            })();
          }}
        />
      </NeuCard>

      <NeuCard variant="flat" style={styles.statusCard}>
        <Text style={[styles.statusLabel, { color: theme.colors.textSoft }]}>Saved read</Text>
        <Text style={[styles.statusTitle, { color: theme.colors.text }]}>{statusCopy}</Text>
        <View style={styles.metricRow}>
          <View
            style={[
              styles.metricPill,
              { backgroundColor: theme.colors.surfaceInset, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{doNowCount}</Text>
            <Text style={[styles.metricText, { color: theme.colors.textMuted }]}>need action</Text>
          </View>
          <View
            style={[
              styles.metricPill,
              { backgroundColor: theme.colors.surfaceInset, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{scheduleCount}</Text>
            <Text style={[styles.metricText, { color: theme.colors.textMuted }]}>worth planning</Text>
          </View>
          <View
            style={[
              styles.metricPill,
              { backgroundColor: theme.colors.surfaceInset, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{activeItems.length}</Text>
            <Text style={[styles.metricText, { color: theme.colors.textMuted }]}>saved</Text>
          </View>
        </View>
      </NeuCard>

      <View style={styles.manualPanel}>
        <View style={styles.manualPanelCopy}>
          <Text style={[styles.manualEyebrow, { color: theme.colors.textSoft }]}>Manual lane</Text>
          <Text style={[styles.manualTitle, { color: theme.colors.text }]}>Need a fuller breakdown?</Text>
          <Text style={[styles.manualCopy, { color: theme.colors.textMuted }]}>
            The manual path is still here when you want to tune the decision signals yourself.
          </Text>
        </View>
        <NeuButton
          label="Use manual breakdown"
          variant="secondary"
          onPress={() => {
            startDraft();
            router.push("/add");
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent saved decisions</Text>
        <Text style={[styles.sectionHint, { color: theme.colors.textSoft }]}>Quietly ordered underneath</Text>
      </View>

      {activeItems.length ? (
        <View style={styles.listColumn}>
          {activeItems.slice(0, 4).map((item) => (
            <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />
          ))}
        </View>
      ) : (
        <NeuCard variant="flat">
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No saved decisions yet.</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Your first useful read will appear here once you save it.
          </Text>
        </NeuCard>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    gap: 20,
  },
  heroCard: {
    position: "relative",
    gap: 16,
    overflow: "hidden",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  heroHeaderCopy: {
    flex: 1,
    gap: 10,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: "SpaceGrotesk_600SemiBold",
    maxWidth: 300,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_500Medium",
    maxWidth: 420,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  heroStatLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroStatValue: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  heroStatMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  quadrantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quadrantCard: {
    width: "47%",
    minHeight: 128,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
    overflow: "hidden",
  },
  quadrantAccent: {
    width: 40,
    height: 4,
    borderRadius: 999,
    marginBottom: 2,
  },
  quadrantCount: {
    fontSize: 28,
    lineHeight: 30,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  quadrantLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quadrantMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "IBMPlexSans_500Medium",
  },
  captureCard: {
    gap: 18,
    paddingTop: 22,
    paddingBottom: 22,
    position: "relative",
  },
  captureGlow: {
    position: "absolute",
    top: -26,
    right: 18,
    width: 136,
    height: 136,
    borderRadius: 999,
    opacity: 0.65,
  },
  captureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  captureHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  captureKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  captureTitle: {
    fontSize: 26,
    lineHeight: 31,
    fontFamily: "SpaceGrotesk_600SemiBold",
    maxWidth: 260,
  },
  captureBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  captureBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    letterSpacing: 0.15,
  },
  inputShell: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 256,
  },
  inputShellShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  inputIconWrap: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  input: {
    height: 232,
    paddingHorizontal: 22,
    paddingVertical: 22,
    paddingRight: 60,
    fontSize: 17,
    lineHeight: 25,
    fontFamily: "IBMPlexSans_500Medium",
  },
  helperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
    flex: 1,
  },
  helperMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  exampleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exampleChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  exampleText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "IBMPlexSans_500Medium",
  },
  statusCard: {
    gap: 10,
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  statusTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricPill: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 4,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  metricText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_500Medium",
  },
  manualPanel: {
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  manualPanelCopy: {
    gap: 6,
  },
  manualEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  manualTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  manualCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_500Medium",
  },
  listColumn: {
    gap: 14,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
