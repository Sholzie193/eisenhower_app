import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { ScreenShell } from "../src/components/ScreenShell";
import { NeuCard } from "../src/components/NeuCard";
import { NeuButton } from "../src/components/NeuButton";
import { ItemCard } from "../src/components/ItemCard";
import { ThemeToggleButton } from "../src/components/ThemeToggleButton";
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
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerBadgeWrap}>
            <Text style={[styles.eyebrow, { color: theme.colors.textSoft }]}>Decision Triage</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>What’s on your mind?</Text>
          </View>
          <ThemeToggleButton />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          One thing, a few competing things, or a messy thought. The app clears the board first, then ranks it.
        </Text>
        <View style={styles.headerMetaRow}>
          <View
            style={[
              styles.headerMetaPill,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.headerMetaLabel, { color: theme.colors.textSoft }]}>Workflow</Text>
            <Text style={[styles.headerMetaValue, { color: theme.colors.text }]}>AI cleanup + matrix read</Text>
          </View>
          <View
            style={[
              styles.headerMetaPill,
              { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
            ]}
          >
            <Text style={[styles.headerMetaLabel, { color: theme.colors.textSoft }]}>Active board</Text>
            <Text style={[styles.headerMetaValue, { color: theme.colors.text }]}>
              {activeItems.length} saved, {doNowCount} loud
            </Text>
          </View>
        </View>
      </View>

      <NeuCard style={styles.captureCard}>
        <View
          pointerEvents="none"
          style={[styles.captureGlow, { backgroundColor: theme.colors.accentWash }]}
        />
        <View style={styles.captureHeader}>
          <View style={styles.captureHeaderCopy}>
            <Text style={[styles.captureKicker, { color: theme.colors.textSoft }]}>Clarity workspace</Text>
            <Text style={[styles.captureTitle, { color: theme.colors.text }]}>Dump the full situation.</Text>
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

      <NeuCard variant="flat" style={styles.manualCard}>
        <Text style={[styles.manualTitle, { color: theme.colors.text }]}>Need a fuller breakdown?</Text>
        <Text style={[styles.manualCopy, { color: theme.colors.textMuted }]}>
          The manual path still exists when you want to adjust the signals yourself.
        </Text>
        <NeuButton
          label="Use manual breakdown"
          variant="secondary"
          onPress={() => {
            startDraft();
            router.push("/add");
          }}
        />
      </NeuCard>

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
    gap: 18,
  },
  headerBlock: {
    gap: 12,
    paddingTop: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  headerBadgeWrap: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 42,
    lineHeight: 46,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "IBMPlexSans_500Medium",
    maxWidth: 420,
  },
  headerMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  headerMetaPill: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  headerMetaLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  headerMetaValue: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_600SemiBold",
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
    gap: 4,
  },
  captureKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  captureTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontFamily: "SpaceGrotesk_600SemiBold",
    maxWidth: 240,
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
  },
  inputShellShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  input: {
    height: 232,
    paddingHorizontal: 22,
    paddingVertical: 22,
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
    paddingVertical: 12,
    gap: 3,
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
  manualCard: {
    gap: 8,
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
