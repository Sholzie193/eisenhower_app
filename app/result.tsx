import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { HeaderButton } from "../src/components/HeaderButton";
import { NeuButton } from "../src/components/NeuButton";
import { NeuCard } from "../src/components/NeuCard";
import { QuadrantPill } from "../src/components/QuadrantPill";
import { ScreenShell } from "../src/components/ScreenShell";
import { evaluateTriage } from "../src/logic/triage";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";
import { goBackOrFallback } from "../src/utils/navigation";
import type { ClarityAnalysis, ClarityCandidate } from "../src/types/decision";

const getClarityLabel = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.decisionShape === "option_choice") {
    switch (candidate.triageResult.quadrant) {
      case "doNow":
        return "Best first option";
      case "schedule":
        return "Best next option";
      case "delegate":
        return "Lighter-touch option";
      case "eliminate":
      default:
        return "Lower-pressure option";
    }
  }

  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return "Do this first";
    case "schedule":
      return "Protect this next";
    case "delegate":
      return "Reduce your direct effort";
    case "eliminate":
    default:
      return "Let this stay lighter";
  }
};

const getActionHeading = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.decisionShape === "option_choice") {
    switch (candidate.triageResult.quadrant) {
      case "doNow":
        return "What to do now";
      case "schedule":
        return "What to do next";
      case "delegate":
        return "How to handle it";
      case "eliminate":
      default:
        return "What to do instead";
    }
  }

  switch (candidate.triageResult.quadrant) {
    case "schedule":
      return "What to do next";
    case "delegate":
      return "How to handle it";
    case "eliminate":
      return "What to do instead";
    case "doNow":
    default:
      return "What to do now";
  }
};

const getDisplayedRecommendation = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.decisionShape !== "option_choice") {
    return candidate.triageResult.recommendation;
  }

  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return "Use this option first while it still has the clearest advantage.";
    case "schedule":
      return "Use this as the cleaner next option, then give it a deliberate slot.";
    case "delegate":
      return "Use this as the lighter-touch option so you do not overcommit.";
    case "eliminate":
    default:
      return "Use this as the lower-pressure default and keep the other option available.";
  }
};

const getDisplayedNextStep = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.decisionShape !== "option_choice") {
    return candidate.triageResult.nextStep;
  }

  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return candidate.triageResult.nextStep;
    case "schedule":
      return "Choose this direction now, then block a calm time for the actual move.";
    case "delegate":
      return "Keep the effort light and avoid turning this into a heavier commitment than it needs to be.";
    case "eliminate":
    default:
      return "Treat this as the simpler default for now, and revisit only if the tradeoff changes.";
  }
};

const getWaitCopy = (candidate: ClarityCandidate) => {
  switch (candidate.triageResult.quadrant) {
    case "schedule":
      return "Important, but it can wait for a calmer time block.";
    case "delegate":
      return "Feels noisy, but it does not need your full attention first.";
    case "eliminate":
      return "Probably not worth much energy right now.";
    case "doNow":
    default:
      return "Valid, just not the strongest first move from this set.";
  }
};

const getWaitingHeading = (analysis: ClarityAnalysis) => {
  if (analysis.activeDecisionGroupId) {
    return analysis.decisionShape === "option_choice" ? "Other option" : "Not the first move";
  }

  if (analysis.decisionShape === "option_choice") {
    return "Other options";
  }

  return "This can wait";
};

const getWaitingEmptyCopy = (analysis: ClarityAnalysis) => {
  if (analysis.activeDecisionGroupId) {
    return analysis.decisionShape === "option_choice"
      ? "No other option looks stronger than the one above."
      : "Nothing else in this decision looks clearer than the move above.";
  }

  if (analysis.decisionShape === "option_choice") {
    return "No other option in this comparison looks stronger than the move above.";
  }

  return "Nothing else in this input looks more important than the move above.";
};

const getAdaptiveWaitCopy = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.activeDecisionGroupId) {
    return analysis.decisionShape === "option_choice"
      ? "A valid option, just not the cleaner first move here."
      : "A real option, just not the clearest first move inside this decision.";
  }

  if (analysis.decisionShape === "option_choice") {
    return "Still valid, just not the strongest option to act on first.";
  }

  return getWaitCopy(candidate);
};

const getModeHeading = (analysis: ClarityAnalysis) => {
  if (analysis.decisionShape === "option_choice") {
    return "Here’s the cleaner option.";
  }

  const { mode } = analysis;
  if (mode === "single") {
    return "This looks like the move.";
  }

  if (mode === "compare") {
    return "This is the clearest first move.";
  }

  return "Here’s the clearer shape.";
};

function ClarityResultScreen() {
  const {
    answerClarityQuestion,
    claritySession,
    clearClarity,
    focusClarityDecisionGroup,
    saveClarityCandidate,
    startDraft,
  } = useAppData();
  const { theme } = useAppTheme();
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!claritySession) {
    return <Redirect href="/" />;
  }

  const { firstMove, question, waiting } = claritySession;
  const currentDecisionGroup =
    claritySession.decisionGroups.find((group) => group.id === claritySession.activeDecisionGroupId) ??
    (claritySession.decisionGroups.length === 1 ? claritySession.decisionGroups[0] : undefined);
  const remainingDecisionGroups = claritySession.decisionGroups.filter(
    (group) => group.id !== claritySession.activeDecisionGroupId
  );
  const questionCandidates = question
    ? claritySession.candidates.filter((candidate) => question.candidateIds.includes(candidate.id))
    : [];

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton
          label="Back"
          icon="chevron-back"
          onPress={() => {
            clearClarity();
            goBackOrFallback("/");
          }}
        />
        <Text style={[styles.step, { color: theme.colors.textSoft }]}>Clarity read</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{getModeHeading(claritySession)}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{claritySession.summary}</Text>
      </View>

      {remainingDecisionGroups.length ? (
        <NeuCard variant="flat" style={styles.questionCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Another decision is here</Text>
          <Text style={[styles.questionPrompt, { color: theme.colors.text }]}>
            {remainingDecisionGroups.length === 1
              ? "There is another separate choice we can resolve next."
              : `There are ${remainingDecisionGroups.length} other separate choices still unresolved.`}
          </Text>
          <View style={styles.questionOptions}>
            {remainingDecisionGroups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => focusClarityDecisionGroup(group.id)}
                style={[
                  styles.questionOption,
                  {
                    backgroundColor: theme.colors.surfaceInset,
                    borderColor: theme.colors.stroke,
                  },
                ]}
              >
                <Text style={[styles.questionOptionText, { color: theme.colors.text }]}>{group.label}</Text>
                {group.tradeoffHint ? (
                  <Text style={[styles.questionHint, { color: theme.colors.textSoft }]}>{group.tradeoffHint}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </NeuCard>
      ) : null}

      {
        <>
          {question ? (
            <NeuCard variant="flat" style={styles.questionCard}>
              <Text style={[styles.label, { color: theme.colors.textSoft }]}>One quick question</Text>
              <Text style={[styles.questionPrompt, { color: theme.colors.text }]}>{question.prompt}</Text>
              <View style={styles.questionOptions}>
                {questionCandidates.map((candidate) => (
                  <Pressable
                    key={candidate.id}
                    onPress={() => answerClarityQuestion(candidate.id)}
                    style={[
                      styles.questionOption,
                      {
                        backgroundColor: theme.colors.surfaceInset,
                        borderColor: theme.colors.stroke,
                      },
                    ]}
                  >
                    <Text style={[styles.questionOptionText, { color: theme.colors.text }]}>
                      {candidate.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.questionHint, { color: theme.colors.textSoft }]}>
                The app is already leaning toward a first move below. This just sharpens the read.
              </Text>
            </NeuCard>
          ) : null}

          <NeuCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <QuadrantPill quadrant={firstMove.triageResult.quadrant} />
              <Text style={[styles.heroTag, { color: theme.quadrants[firstMove.triageResult.quadrant].solid }]}>
                {getClarityLabel(claritySession, firstMove)}
              </Text>
            </View>

            {claritySession.decisionLabel ? (
              <Text style={[styles.label, { color: theme.colors.textSoft }]}>
                Decision: {claritySession.decisionLabel}
              </Text>
            ) : null}
            {currentDecisionGroup?.tradeoffHint ? (
              <Text style={[styles.waitFootnote, { color: theme.colors.textSoft }]}>
                {currentDecisionGroup.tradeoffHint}
              </Text>
            ) : null}
            <Text style={[styles.primaryTitle, { color: theme.colors.text }]}>{firstMove.title}</Text>
            <Text style={[styles.primaryWhy, { color: theme.colors.textMuted }]}>{firstMove.calmingWhy}</Text>
            {firstMove.reasonTags.length ? (
              <View style={styles.factorRow}>
                {firstMove.reasonTags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.factorChip,
                      {
                        backgroundColor: theme.colors.surfaceInset,
                        borderColor: theme.colors.stroke,
                      },
                    ]}
                  >
                    <Text style={[styles.factorText, { color: theme.colors.textSoft }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {claritySession.contextHints.length ? (
              <Text style={[styles.waitFootnote, { color: theme.colors.textSoft }]}>
                {claritySession.contextHints[0]}
              </Text>
            ) : null}
          </NeuCard>

          <NeuCard variant="flat" style={styles.nextCard}>
            <Text style={[styles.label, { color: theme.colors.textSoft }]}>
              {getActionHeading(claritySession, firstMove)}
            </Text>
            <Text style={[styles.nextMove, { color: theme.colors.text }]}>
              {getDisplayedRecommendation(claritySession, firstMove)}
            </Text>
            <Text style={[styles.nextStep, { color: theme.colors.textMuted }]}>
              {getDisplayedNextStep(claritySession, firstMove)}
            </Text>
          </NeuCard>

          <NeuCard variant="flat" style={styles.waitCard}>
            <Text style={[styles.label, { color: theme.colors.textSoft }]}>{getWaitingHeading(claritySession)}</Text>
            {waiting.length ? (
              <View style={styles.waitList}>
                {waiting.slice(0, 3).map((candidate) => (
                  <View key={candidate.id} style={styles.waitRow}>
                    <Text style={[styles.waitTitle, { color: theme.colors.text }]}>{candidate.title}</Text>
                    <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>
                      {getAdaptiveWaitCopy(claritySession, candidate)}
                    </Text>
                  </View>
                ))}
                {claritySession.narrowedFromCount && claritySession.narrowedFromCount > claritySession.candidates.length ? (
                  <Text style={[styles.waitFootnote, { color: theme.colors.textSoft }]}>
                    {claritySession.narrowedFromCount - claritySession.candidates.length} more idea
                    {claritySession.narrowedFromCount - claritySession.candidates.length === 1 ? "" : "s"} stayed in
                    the background for now.
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>
                {getWaitingEmptyCopy(claritySession)}
              </Text>
            )}
          </NeuCard>

          <Pressable onPress={() => setShowBreakdown((currentValue) => !currentValue)}>
            <NeuCard variant="flat" style={styles.breakdownToggle}>
              <Text style={[styles.breakdownTitle, { color: theme.colors.text }]}>
                {showBreakdown ? "Hide deeper breakdown" : "See deeper breakdown"}
              </Text>
              <Text style={[styles.breakdownCopy, { color: theme.colors.textMuted }]}>
                Matrix signals and ordering stay available, just not first.
              </Text>
            </NeuCard>
          </Pressable>

          {showBreakdown ? (
            <View style={styles.breakdownList}>
              {claritySession.candidates.map((candidate, index) => (
                <NeuCard key={candidate.id} variant="flat" style={styles.breakdownCard}>
                  <View style={styles.breakdownTop}>
                    <Text style={[styles.breakdownRank, { color: theme.colors.textSoft }]}>#{index + 1}</Text>
                    <QuadrantPill quadrant={candidate.triageResult.quadrant} compact />
                  </View>
                  <Text style={[styles.breakdownCandidateTitle, { color: theme.colors.text }]}>{candidate.title}</Text>
                  <Text style={[styles.breakdownCandidateCopy, { color: theme.colors.textMuted }]}>
                    {candidate.triageResult.explanation}
                  </Text>
                </NeuCard>
              ))}
            </View>
          ) : null}

          <NeuButton
            label="Save first move"
            onPress={() => {
              const savedId = saveClarityCandidate(firstMove, claritySession.rawInput);
              clearClarity();
              router.replace(`/item/${savedId}`);
            }}
          />
          <NeuButton
            label="Refine manually"
            variant="secondary"
            onPress={() => {
              startDraft({
                title: firstMove.title,
                notes:
                  claritySession.rawInput.trim().toLowerCase() === firstMove.title.trim().toLowerCase()
                    ? ""
                    : claritySession.rawInput.trim(),
                category: firstMove.category,
                triageAnswers: firstMove.triageAnswers,
              });
              router.replace("/add");
            }}
          />
          <NeuButton
            label="Start fresh"
            variant="secondary"
            onPress={() => {
              clearClarity();
              router.replace("/");
            }}
          />
        </>
      }
    </ScreenShell>
  );
}

function ManualResultScreen() {
  const { draft, saveDraftResult } = useAppData();
  const { theme } = useAppTheme();

  if (!draft) {
    return <Redirect href="/" />;
  }

  const result = evaluateTriage(draft.triageAnswers);
  const quadrantColors = theme.quadrants[result.quadrant];
  const verdict =
    result.quadrant === "doNow"
      ? "Do this now"
      : result.quadrant === "schedule"
        ? "Protect time for this"
        : result.quadrant === "delegate"
          ? "Reduce your direct effort"
          : "Let this stay light";

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton label="Back" icon="chevron-back" onPress={() => goBackOrFallback("/triage")} />
        <Text style={[styles.step, { color: theme.colors.textSoft }]}>Manual read</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Clearer read</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          The structured signals point to one calmer next move.
        </Text>
      </View>

      <NeuCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <QuadrantPill quadrant={result.quadrant} />
          <Text style={[styles.heroTag, { color: quadrantColors.solid }]}>Matrix read</Text>
        </View>

        <Text style={[styles.primaryTitle, { color: theme.colors.text }]}>{verdict}</Text>
        <Text style={[styles.primaryWhy, { color: theme.colors.textMuted }]}>{result.explanation}</Text>
      </NeuCard>

      <NeuCard variant="flat" style={styles.nextCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>What to do now</Text>
        <Text style={[styles.nextMove, { color: theme.colors.text }]}>{result.recommendation}</Text>
        <Text style={[styles.nextStep, { color: theme.colors.textMuted }]}>{result.nextStep}</Text>
      </NeuCard>

      <View style={styles.signalGrid}>
        <NeuCard variant="flat" style={styles.signalCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Urgency signal</Text>
          <Text style={[styles.signalText, { color: theme.colors.text }]}>
            {result.urgencyReasons[0] ?? "No strong urgency signal."}
          </Text>
        </NeuCard>
        <NeuCard variant="flat" style={styles.signalCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Importance signal</Text>
          <Text style={[styles.signalText, { color: theme.colors.text }]}>
            {result.importanceReasons[0] ?? "No strong importance signal."}
          </Text>
        </NeuCard>
      </View>

      <NeuButton
        label={draft.editingId ? "Update saved decision" : "Save to home"}
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
      <NeuButton label="Adjust signals" variant="secondary" onPress={() => goBackOrFallback("/triage")} />
    </ScreenShell>
  );
}

export default function ResultScreen() {
  const { claritySession, draft } = useAppData();

  if (claritySession) {
    return <ClarityResultScreen />;
  }

  if (draft) {
    return <ManualResultScreen />;
  }

  return <Redirect href="/" />;
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
    lineHeight: 21,
    fontFamily: "IBMPlexSans_500Medium",
  },
  heroCard: {
    gap: 12,
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
  primaryTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  primaryWhy: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_500Medium",
  },
  factorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  factorChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  factorText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  label: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  nextCard: {
    gap: 8,
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
  waitCard: {
    gap: 12,
  },
  waitList: {
    gap: 10,
  },
  waitRow: {
    gap: 4,
  },
  waitTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  waitText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
  },
  waitFootnote: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "IBMPlexSans_500Medium",
  },
  questionCard: {
    gap: 12,
  },
  questionPrompt: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  questionOptions: {
    gap: 8,
  },
  questionOption: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  questionOptionText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  questionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_500Medium",
  },
  breakdownToggle: {
    gap: 6,
  },
  breakdownTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  breakdownCopy: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
  },
  breakdownList: {
    gap: 10,
  },
  breakdownCard: {
    gap: 8,
  },
  breakdownTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownRank: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  breakdownCandidateTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  breakdownCandidateCopy: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
  },
  signalGrid: {
    gap: 10,
  },
  signalCard: {
    gap: 8,
  },
  signalText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
