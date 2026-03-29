import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../src/components/HeaderButton";
import { ScreenShell } from "../src/components/ScreenShell";
import { NeuCard } from "../src/components/NeuCard";
import { NeuButton } from "../src/components/NeuButton";
import { QuadrantPill } from "../src/components/QuadrantPill";
import { evaluateTriage } from "../src/logic/triage";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";
import { goBackOrFallback } from "../src/utils/navigation";

export default function ResultScreen() {
  const { draft, saveDraftResult } = useAppData();
  const { theme } = useAppTheme();

  if (!draft) {
    return <Redirect href="/" />;
  }

  const result = evaluateTriage(draft.triageAnswers);
  const quadrantColors = theme.quadrants[result.quadrant];
  const verdict =
    result.quadrant === "doNow"
      ? "Do now"
      : result.quadrant === "schedule"
        ? "Schedule it"
        : result.quadrant === "delegate"
          ? "Reduce it"
          : "Drop it";

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton label="Back" icon="chevron-back" onPress={() => goBackOrFallback("/triage")} />
        <Text style={[styles.step, { color: theme.colors.textSoft }]}>Step 3 of 3</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Verdict</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          One clear lane. One clear next move.
        </Text>
      </View>

      <NeuCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <QuadrantPill quadrant={result.quadrant} />
          <Text style={[styles.heroTag, { color: quadrantColors.solid }]}>Recommended</Text>
        </View>

        <Text style={[styles.verdict, { color: theme.colors.text }]}>{verdict}</Text>
        <Text style={[styles.explanation, { color: theme.colors.textMuted }]}>{result.explanation}</Text>

        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surfaceInset }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textSoft }]}>Urgency</Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{result.urgencyScore.toFixed(1)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surfaceInset }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textSoft }]}>Importance</Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{result.importanceScore.toFixed(1)}</Text>
          </View>
        </View>
      </NeuCard>

      <NeuCard variant="flat" style={styles.nextCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Do this next</Text>
        <Text style={[styles.nextMove, { color: theme.colors.text }]}>{result.recommendation}</Text>
        <Text style={[styles.nextStep, { color: theme.colors.textMuted }]}>{result.nextStep}</Text>
      </NeuCard>

      <View style={styles.whyGrid}>
        <NeuCard variant="flat" style={styles.whyCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Urgency signal</Text>
          <Text style={[styles.whyText, { color: theme.colors.text }]}>
            {result.urgencyReasons[0] ?? "No immediate pressure signal."}
          </Text>
        </NeuCard>
        <NeuCard variant="flat" style={styles.whyCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Importance signal</Text>
          <Text style={[styles.whyText, { color: theme.colors.text }]}>
            {result.importanceReasons[0] ?? "No strong importance signal."}
          </Text>
        </NeuCard>
      </View>

      <NeuButton
        label={draft.editingId ? "Update item" : "Save to dashboard"}
        onPress={() => {
          const isEditing = Boolean(draft.editingId);
          const savedId = saveDraftResult(result);
          if (savedId && isEditing) {
            router.replace(`/item/${savedId}`);
            return;
          }

          router.replace("/");
        }}
      />
      <NeuButton label="Adjust answers" variant="secondary" onPress={() => goBackOrFallback("/triage")} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  step: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  heroCard: {
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroTag: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  verdict: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  explanation: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_500Medium",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "IBMPlexSans_700Bold",
  },
  nextCard: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  nextMove: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  nextStep: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "IBMPlexSans_500Medium",
  },
  whyGrid: {
    gap: 10,
  },
  whyCard: {
    gap: 8,
  },
  whyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
