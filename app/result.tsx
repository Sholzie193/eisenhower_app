import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { HeaderButton } from "../src/components/HeaderButton";
import { NeuButton } from "../src/components/NeuButton";
import { NeuCard } from "../src/components/NeuCard";
import { QuadrantPill } from "../src/components/QuadrantPill";
import { ScreenShell } from "../src/components/ScreenShell";
import { ClarityV1Result } from "../src/features/clarity-v1/components/ClarityV1Result";
import { evaluateTriage } from "../src/logic/triage";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";
import { goBackOrFallback } from "../src/utils/navigation";
import type { ClarityAnalysis, ClarityCandidate } from "../src/types/decision";

const getClarityLabel = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  void analysis;
  void candidate;
  return "Clearest next move";
};

const toSentence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const stripTrailingPeriod = (value: string) => value.replace(/[.]+$/g, "").trim();

const dedupeBullets = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const dedupeCandidates = (values: ClarityCandidate[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.id)) {
      return false;
    }

    seen.add(value.id);
    return true;
  });
};

const joinTitles = (titles: string[]) => {
  if (!titles.length) {
    return "";
  }

  if (titles.length === 1) {
    return titles[0];
  }

  if (titles.length === 2) {
    return `${titles[0]} and ${titles[1]}`;
  }

  return `${titles.slice(0, -1).join(", ")}, and ${titles.at(-1)}`;
};

const getConsideredBoard = (analysis: ClarityAnalysis) => {
  const rawTitles = analysis.structuredCleanup?.considered_items ?? analysis.candidates.map((candidate) => candidate.title);
  const titles = dedupeBullets(rawTitles).slice(0, 5);
  const hiddenCount = Math.max(0, rawTitles.length - titles.length);
  const context = dedupeBullets([...(analysis.structuredCleanup?.context_notes ?? []), ...analysis.contextHints]).slice(0, 2);

  return { titles, context, hiddenCount };
};

const getStillInPlayItems = (analysis: ClarityAnalysis) => {
  const stillTitles = analysis.structuredCleanup?.still_in_play ?? [];
  const fromStructured = stillTitles
    .map((title) =>
      analysis.candidates.find((candidate) => candidate.title.trim().toLowerCase() === title.trim().toLowerCase())
    )
    .filter((candidate): candidate is ClarityCandidate => Boolean(candidate));

  return dedupeCandidates(
    [...fromStructured, ...analysis.activeItems].filter(
      (candidate) => candidate.id !== analysis.firstMove?.id
    )
  );
};

const getCanWaitItems = (analysis: ClarityAnalysis) => {
  const waitTitles = analysis.structuredCleanup?.what_can_wait ?? [];
  const stillIds = new Set(getStillInPlayItems(analysis).map((candidate) => candidate.id));
  const fromStructured = waitTitles
    .map((title) =>
      analysis.candidates.find((candidate) => candidate.title.trim().toLowerCase() === title.trim().toLowerCase())
    )
    .filter((candidate): candidate is ClarityCandidate => Boolean(candidate));

  return dedupeCandidates(
    [...fromStructured, ...analysis.laterItems].filter(
      (candidate) => candidate.id !== analysis.firstMove?.id && !stillIds.has(candidate.id)
    )
  );
};

const titleHas = (candidate: ClarityCandidate | null | undefined, expression: RegExp) =>
  Boolean(candidate && expression.test(candidate.title.toLowerCase()));

const getWhyThisFirstCopy = (analysis: ClarityAnalysis) => {
  if (analysis.structuredCleanup?.why_first) {
    return analysis.structuredCleanup.why_first;
  }

  if (!analysis.firstMove) {
    return "";
  }

  const firstMove = analysis.firstMove;
  const compareAgainst = getStillInPlayItems(analysis)[0] ?? getCanWaitItems(analysis)[0] ?? null;
  if (!compareAgainst) {
    return toSentence(firstMove.calmingWhy);
  }

  const lines: string[] = [];

  if (
    firstMove.triageAnswers.hasDeadline && !compareAgainst.triageAnswers.hasDeadline ||
    firstMove.delayCostScore > compareAgainst.delayCostScore + 0.45
  ) {
    lines.push(`${stripTrailingPeriod(firstMove.title)} gets harder if you leave it untouched`);
  }

  if (
    compareAgainst.delayCostScore < firstMove.delayCostScore ||
    (!compareAgainst.triageAnswers.hasDeadline && firstMove.triageAnswers.hasDeadline)
  ) {
    lines.push(`${stripTrailingPeriod(compareAgainst.title)} still matters, but it has less immediate pressure`);
  }

  if (
    analysis.contextKinds.includes("lowEnergy") &&
    firstMove.executionEaseScore >= compareAgainst.executionEaseScore + 0.35
  ) {
    lines.push(
      `Low energy makes ${stripTrailingPeriod(firstMove.title).toLowerCase()} more realistic than ${stripTrailingPeriod(compareAgainst.title).toLowerCase()}`
    );
  }

  if (!lines.length) {
    lines.push(
      `${stripTrailingPeriod(firstMove.title)} leads because it is the clearest move to make before ${stripTrailingPeriod(compareAgainst.title).toLowerCase()}`
    );
  }

  return toSentence(lines.join(". "));
};

const getStillInPlayCopy = (candidate: ClarityCandidate) => {
  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return "Still meaningful, just not the cleanest place to start.";
    case "schedule":
      return "Still matters, but it can follow after the first move settles.";
    case "delegate":
      return "Still worth moving, just not worth the first block of effort.";
    case "eliminate":
    default:
      return "Still part of the picture, but it carries less pressure right now.";
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

const getWaitCopy = (candidate: ClarityCandidate) => {
  switch (candidate.triageResult.quadrant) {
    case "schedule":
      return "This still matters, but it can sit behind a calmer time block.";
    case "delegate":
      return "This can stay lighter for now without much cost.";
    case "eliminate":
      return "Low pressure right now, so it does not need foreground attention.";
    case "doNow":
    default:
      return "Valid, but it carries less pressure than the move above.";
  }
};

const getNextStepCopy = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.decisionShape === "option_choice") {
    switch (candidate.triageResult.quadrant) {
      case "doNow":
        return "Make the first concrete move now so the cleaner option actually starts moving.";
      case "schedule":
        return "Pick a time today or tomorrow to handle this deliberately, and keep it off the urgent pile.";
      case "delegate":
        return "Choose the lightest workable version and keep it from growing into heavier effort.";
      case "eliminate":
      default:
        return "Let this stay light for now and only bring it forward if the tradeoff changes.";
    }
  }

  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return "Start the smallest concrete step now so it stops sitting in your head.";
    case "schedule":
      return "Give it a clear slot before the friction grows, but do not treat it like an emergency.";
    case "delegate":
      return "Keep it moving with the lightest useful action instead of taking it on fully.";
    case "eliminate":
    default:
      return "Move it out of the foreground so it stops taking attention it has not earned.";
  }
};

const getAdaptiveWaitCopy = (analysis: ClarityAnalysis, candidate: ClarityCandidate) => {
  if (analysis.decisionShape === "option_choice") {
    return "A valid option, but it does not need to lead.";
  }

  return getWaitCopy(candidate);
};

const getModeHeading = (analysis: ClarityAnalysis) => {
  if (analysis.decisionShape === "multiple_decisions") {
    return "Here’s the clearest move first.";
  }

  return "Clearer next step";
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

  if (claritySession.status === "failed" || !claritySession.firstMove) {
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
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {claritySession.failureTitle ?? "I couldn't get a reliable read of this yet."}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {claritySession.failureMessage ??
              "Try again, or switch to the manual breakdown if you want a deterministic read."}
          </Text>
        </View>

        <NeuCard style={styles.heroCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Clarity needs a reliable AI read</Text>
          <Text style={[styles.primaryWhy, { color: theme.colors.textMuted }]}>
            The app did not get a structured result it trusts, so it is not showing a guessed recommendation.
          </Text>
        </NeuCard>

        <NeuButton
          label="Try Clarity again"
          onPress={() => {
            router.replace("/");
          }}
        />
        <NeuButton
          label="Refine manually"
          variant="secondary"
          onPress={() => {
            startDraft({
              title: "",
              notes: claritySession.rawInput.trim(),
            });
            router.replace("/add");
          }}
        />
      </ScreenShell>
    );
  }

  const { firstMove, question } = claritySession;
  void question;
  const consideredBoard = getConsideredBoard(claritySession);
  const activeItems = getStillInPlayItems(claritySession).slice(0, 3);
  const laterItems = getCanWaitItems(claritySession).slice(0, 3);
  const whyThisFirst = getWhyThisFirstCopy(claritySession);

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

      {
        <>
          {consideredBoard.titles.length ? (
            <NeuCard variant="flat" style={styles.sectionCard}>
              <Text style={[styles.label, { color: theme.colors.textSoft }]}>What I considered</Text>
              <View style={styles.boardList}>
                {consideredBoard.titles.map((title) => (
                  <View
                    key={title}
                    style={[
                      styles.boardChip,
                      {
                        backgroundColor: theme.colors.surfaceInset,
                        borderColor: theme.colors.stroke,
                      },
                    ]}
                  >
                    <Text style={[styles.boardChipText, { color: theme.colors.text }]}>{title}</Text>
                  </View>
                ))}
              </View>
              {consideredBoard.context.length ? (
                <Text style={[styles.boardMeta, { color: theme.colors.textSoft }]}>
                  Also shaping this: {consideredBoard.context.join(" / ")}
                </Text>
              ) : null}
              {consideredBoard.hiddenCount ? (
                <Text style={[styles.boardMeta, { color: theme.colors.textSoft }]}>
                  {consideredBoard.hiddenCount} more item
                  {consideredBoard.hiddenCount === 1 ? "" : "s"} stayed in the full board behind this narrowed view.
                </Text>
              ) : null}
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
            <Text style={[styles.primaryTitle, { color: theme.colors.text }]}>{firstMove.title}</Text>
            <Text style={[styles.primaryWhy, { color: theme.colors.textMuted }]}>
              {firstMove.calmingWhy}
            </Text>
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
          </NeuCard>

          <NeuCard variant="flat" style={styles.nextCard}>
              <Text style={[styles.label, { color: theme.colors.textSoft }]}>
                {getActionHeading(claritySession, firstMove)}
              </Text>
              <Text style={[styles.nextMove, { color: theme.colors.text }]}>Start with {firstMove.title}.</Text>
              <Text style={[styles.nextStep, { color: theme.colors.textMuted }]}>
                {getNextStepCopy(claritySession, firstMove)}
              </Text>
          </NeuCard>

          <NeuCard variant="flat" style={styles.sectionCard}>
            <Text style={[styles.label, { color: theme.colors.textSoft }]}>Why this first</Text>
            <Text style={[styles.whyTitle, { color: theme.colors.text }]}>{firstMove.title}</Text>
            <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>{whyThisFirst}</Text>
          </NeuCard>

          <NeuCard variant="flat" style={styles.waitCard}>
            <Text style={[styles.label, { color: theme.colors.textSoft }]}>Still in play</Text>
            {activeItems.length ? (
              <View style={styles.waitList}>
                {activeItems.map((candidate) => (
                  <View key={candidate.id} style={styles.waitRow}>
                    <Text style={[styles.waitTitle, { color: theme.colors.text }]}>{candidate.title}</Text>
                    <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>
                      {getStillInPlayCopy(candidate)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>
                Nothing else looks like it needs the same level of attention right away.
              </Text>
            )}
          </NeuCard>

          <NeuCard variant="flat" style={styles.waitCard}>
            <Text style={[styles.label, { color: theme.colors.textSoft }]}>What can wait</Text>
            {laterItems.length ? (
              <View style={styles.waitList}>
                {laterItems.map((candidate) => (
                  <View key={candidate.id} style={styles.waitRow}>
                    <Text style={[styles.waitTitle, { color: theme.colors.text }]}>{candidate.title}</Text>
                    <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>
                      {getAdaptiveWaitCopy(claritySession, candidate)}
                    </Text>
                  </View>
                ))}
                {claritySession.candidates.length > 1 + activeItems.length + laterItems.length ? (
                  <Text style={[styles.waitFootnote, { color: theme.colors.textSoft }]}>
                    {claritySession.candidates.length - (1 + activeItems.length + laterItems.length)} more item
                    {claritySession.candidates.length - (1 + activeItems.length + laterItems.length) === 1 ? "" : "s"} were
                    considered, but they carry less pressure than the items above.
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.waitText, { color: theme.colors.textMuted }]}>
                Nothing else needs to sit heavily in the foreground right now.
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
    return <ClarityV1Result />;
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
  sectionCard: {
    gap: 10,
  },
  boardList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  boardChip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  boardChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  boardMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_500Medium",
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
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletMarker: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  whyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "IBMPlexSans_600SemiBold",
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
