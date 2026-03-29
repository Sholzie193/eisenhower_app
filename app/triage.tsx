import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../src/components/HeaderButton";
import { ScreenShell } from "../src/components/ScreenShell";
import { NeuCard } from "../src/components/NeuCard";
import { NeuButton } from "../src/components/NeuButton";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { ChipGroup } from "../src/components/ChipGroup";
import { evaluateTriage } from "../src/logic/triage";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";
import { goBackOrFallback } from "../src/utils/navigation";
import type {
  DelayImpact,
  DueWindow,
  HandlingChoice,
  ImportanceSignal,
  ImpactArea,
} from "../src/types/decision";

const DUE_OPTIONS: { label: string; value: DueWindow }[] = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This week", value: "thisWeek" },
  { label: "Later", value: "later" },
  { label: "No deadline", value: "noDeadline" },
];

const IMPACT_OPTIONS: { label: string; value: ImpactArea }[] = [
  { label: "Money", value: "money" },
  { label: "Health", value: "health" },
  { label: "Safety", value: "safety" },
  { label: "Work", value: "work" },
  { label: "Housing", value: "housing" },
  { label: "Goals", value: "longTermGoals" },
  { label: "Relationships", value: "relationships" },
  { label: "Reputation", value: "reputation" },
];

export default function TriageScreen() {
  const { draft, updateDraft } = useAppData();
  const { theme } = useAppTheme();

  if (!draft) {
    return <Redirect href="/" />;
  }

  const answers = draft.triageAnswers;
  const preview = evaluateTriage(answers);

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton label="Back" icon="chevron-back" onPress={() => goBackOrFallback("/add")} />
        <Text style={[styles.step, { color: theme.colors.textSoft }]}>Manual lane</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Tighten the signal.</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Only a few cues. The matrix read updates as you go.
        </Text>
      </View>

      <NeuCard style={styles.previewCard}>
        <View style={styles.previewTop}>
          <Text style={[styles.previewLabel, { color: theme.colors.textSoft }]}>Current read</Text>
          <Text style={[styles.previewQuadrant, { color: theme.quadrants[preview.quadrant].solid }]}>
            {preview.quadrant === "doNow"
              ? "Do Now"
              : preview.quadrant === "schedule"
                ? "Schedule"
                : preview.quadrant === "delegate"
                  ? "Reduce"
                  : "Drop"}
          </Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreTitle, { color: theme.colors.textMuted }]}>Urgency</Text>
            <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceInset }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${preview.urgencyScore * 10}%`,
                    backgroundColor: theme.quadrants.doNow.solid,
                  },
                ]}
              />
            </View>
            <Text style={[styles.scoreValue, { color: theme.colors.text }]}>{preview.urgencyScore.toFixed(1)}</Text>
          </View>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreTitle, { color: theme.colors.textMuted }]}>Importance</Text>
            <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceInset }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${preview.importanceScore * 10}%`,
                    backgroundColor: theme.quadrants.schedule.solid,
                  },
                ]}
              />
            </View>
            <Text style={[styles.scoreValue, { color: theme.colors.text }]}>{preview.importanceScore.toFixed(1)}</Text>
          </View>
        </View>
      </NeuCard>

      <NeuCard style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={[styles.questionTitle, { color: theme.colors.text }]}>Does it have a real deadline?</Text>
          <Text style={[styles.questionHint, { color: theme.colors.textMuted }]}>A real deadline changes the shape fast.</Text>
        </View>
        <SegmentedControl
          value={answers.hasDeadline ? "yes" : "no"}
          onChange={(value) =>
            updateDraft({
              triageAnswers: {
                ...answers,
                hasDeadline: value === "yes",
                dueWindow:
                  value === "yes"
                    ? answers.dueWindow === "noDeadline"
                      ? "today"
                      : answers.dueWindow
                    : "noDeadline",
              },
            })
          }
          options={[
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ]}
        />
      </NeuCard>

      {answers.hasDeadline ? (
        <NeuCard style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={[styles.questionTitle, { color: theme.colors.text }]}>How soon is it due?</Text>
          <Text style={[styles.questionHint, { color: theme.colors.textMuted }]}>Pick the nearest honest window.</Text>
          </View>
          <ChipGroup
            options={DUE_OPTIONS.filter((option) => option.value !== "noDeadline")}
            selected={[answers.dueWindow]}
            onChange={(selected) =>
              updateDraft({
                triageAnswers: {
                  ...answers,
                  dueWindow: selected[0] ?? "today",
                  hasDeadline: true,
                },
              })
            }
          />
        </NeuCard>
      ) : null}

      <NeuCard style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={[styles.questionTitle, { color: theme.colors.text }]}>What does delay cost?</Text>
          <Text style={[styles.questionHint, { color: theme.colors.textMuted }]}>Think consequence, not guilt.</Text>
        </View>
        <SegmentedControl<DelayImpact>
          value={answers.delayImpact}
          onChange={(delayImpact) => updateDraft({ triageAnswers: { ...answers, delayImpact } })}
          options={[
            { label: "Almost none", value: "none" },
            { label: "Mild", value: "annoying" },
            { label: "Disruptive", value: "disruptive" },
            { label: "Severe", value: "severe" },
          ]}
        />
      </NeuCard>

      <NeuCard style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={[styles.questionTitle, { color: theme.colors.text }]}>Which core areas does it touch?</Text>
          <Text style={[styles.questionHint, { color: theme.colors.textMuted }]}>Only select what truly changes the stakes.</Text>
        </View>
        <ChipGroup
          options={IMPACT_OPTIONS}
          selected={answers.impactAreas}
          onChange={(impactAreas) => updateDraft({ triageAnswers: { ...answers, impactAreas } })}
          multiple
        />
      </NeuCard>

      <NeuCard style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={[styles.questionTitle, { color: theme.colors.text }]}>Is it important or just loud?</Text>
          <Text style={[styles.questionHint, { color: theme.colors.textMuted }]}>Separate what matters from what only feels loud.</Text>
        </View>
        <SegmentedControl<ImportanceSignal>
          value={answers.importanceSignal}
          onChange={(importanceSignal) =>
            updateDraft({ triageAnswers: { ...answers, importanceSignal } })
          }
          options={[
            { label: "Meaningful", value: "meaningful" },
            { label: "Mixed", value: "unclear" },
            { label: "Mostly noise", value: "mostlyNoise" },
          ]}
        />
      </NeuCard>

      <NeuCard style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={[styles.questionTitle, { color: theme.colors.text }]}>What is the smartest handling?</Text>
          <Text style={[styles.questionHint, { color: theme.colors.textMuted }]}>Your effort is not always the right container.</Text>
        </View>
        <ChipGroup
          options={[
            { label: "Direct", value: "direct" as HandlingChoice },
            { label: "Delegate", value: "delegate" as HandlingChoice },
            { label: "Automate", value: "automate" as HandlingChoice },
            { label: "Reduce", value: "reduce" as HandlingChoice },
            { label: "Ignore", value: "ignore" as HandlingChoice },
          ]}
          selected={[answers.handlingChoice]}
          onChange={(selected) =>
            updateDraft({
              triageAnswers: {
                ...answers,
                handlingChoice: selected[0] ?? "direct",
              },
            })
          }
        />
      </NeuCard>

      <NeuButton label="See clearer read" onPress={() => router.push("/result")} />
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
  previewCard: {
    gap: 14,
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  previewQuadrant: {
    fontSize: 13,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  scoreRow: {
    gap: 14,
  },
  scoreBlock: {
    gap: 6,
  },
  scoreTitle: {
    fontSize: 13,
    fontFamily: "IBMPlexSans_500Medium",
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  scoreValue: {
    fontSize: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  questionCard: {
    gap: 12,
  },
  questionHeader: {
    gap: 4,
  },
  questionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  questionHint: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
