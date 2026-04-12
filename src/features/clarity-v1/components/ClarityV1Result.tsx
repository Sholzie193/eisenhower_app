import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../../../components/HeaderButton";
import { NeuButton } from "../../../components/NeuButton";
import { NeuCard } from "../../../components/NeuCard";
import { QuadrantPill } from "../../../components/QuadrantPill";
import { ScreenShell } from "../../../components/ScreenShell";
import { useAppData } from "../../../providers/app-provider";
import { useAppTheme } from "../../../providers/theme-provider";
import { goBackOrFallback } from "../../../utils/navigation";
import type { ClarityCandidate } from "../../../types/decision";

const dedupeStrings = (values: string[]) => {
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

const getRankLane = (candidate: ClarityCandidate, index: number) => {
  if (index === 0) {
    return "Lead move";
  }

  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return "Still urgent";
    case "schedule":
      return "Important, but calmer";
    case "delegate":
      return "Lighter handling";
    case "eliminate":
    default:
      return "Lowest pressure";
  }
};

const getRankCopy = (candidate: ClarityCandidate, index: number) => {
  if (index === 0) {
    return "This leads the board right now, so it should get the first block of attention.";
  }

  switch (candidate.triageResult.quadrant) {
    case "doNow":
      return "This still carries real downside if ignored, but it no longer deserves the first slot.";
    case "schedule":
      return "This matters enough to keep, but it should follow a deliberate block instead of leading the session.";
    case "delegate":
      return "Keep it moving with the lightest workable action rather than giving it the main block of effort.";
    case "eliminate":
    default:
      return "Leave this out of the foreground unless the facts change.";
  }
};

const getRankDecisionLabel = (candidate: ClarityCandidate, index: number) =>
  index === 0 ? "Do first" : candidate.triageResult.recommendation;

export function ClarityV1Result() {
  const { claritySession, clearClarity, saveClarityCandidate, saveClarityCandidates, startDraft } = useAppData();
  const { theme } = useAppTheme();

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

        <NeuCard style={styles.sectionCard}>
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Clarity needs a cleaner signal</Text>
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>
            The app could not turn this into a stable task board yet, so it is not showing a guessed recommendation.
          </Text>
        </NeuCard>

        <NeuButton label="Try Clarity again" onPress={() => router.replace("/")} />
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

  const firstMove = claritySession.firstMove;
  const considered = claritySession.candidates.map((candidate) => candidate.title).slice(0, 8);
  const contextNotes = dedupeStrings(claritySession.structuredCleanup?.context_notes ?? claritySession.contextHints).slice(0, 3);
  const whyFirst = firstMove.calmingWhy;
  const rankedCandidates = claritySession.candidates;
  const shouldSaveWholeBoard = rankedCandidates.length > 1;

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
        <Text style={[styles.title, { color: theme.colors.text }]}>Ranked board</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          {claritySession.summary} Every extracted task below is ranked and given its own lane.
        </Text>
      </View>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>What I considered</Text>
        <View style={styles.boardList}>
          {considered.map((item) => (
            <View
              key={item}
              style={[
                styles.boardChip,
                {
                  backgroundColor: theme.colors.surfaceInset,
                  borderColor: theme.colors.stroke,
                },
              ]}
            >
              <Text style={[styles.boardChipText, { color: theme.colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
        {contextNotes.length ? (
          <Text style={[styles.meta, { color: theme.colors.textSoft }]}>
            Also shaping this: {contextNotes.join(" / ")}
          </Text>
        ) : null}
      </NeuCard>

      <NeuCard style={styles.heroCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Top-ranked first move</Text>
        <Text style={[styles.primaryTitle, { color: theme.colors.text }]}>{firstMove.title}</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          {firstMove.triageResult.recommendation}
        </Text>
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>What to do now</Text>
        <Text style={[styles.bodyLead, { color: theme.colors.text }]}>Start with {firstMove.title}.</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          {firstMove.triageResult.nextStep}
        </Text>
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Ranked decisions</Text>
        <Text style={[styles.meta, { color: theme.colors.textSoft }]}>
          Every extracted task is ranked by urgency, importance, cost of delay, and energy fit.
        </Text>
        {rankedCandidates.length ? (
          <View style={styles.rankingList}>
            {rankedCandidates.map((candidate, index) => (
              <View
                key={candidate.id}
                style={[
                  styles.rankingRow,
                  {
                    backgroundColor: theme.colors.surfaceInset,
                    borderColor: theme.colors.stroke,
                  },
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.stroke,
                    },
                  ]}
                >
                  <Text style={[styles.rankBadgeText, { color: theme.colors.text }]}>#{index + 1}</Text>
                </View>
                <View style={styles.rankingBody}>
                  <View style={styles.rankingTop}>
                    <Text style={[styles.rowTitle, styles.rankingTitle, { color: theme.colors.text }]}>
                      {candidate.title}
                    </Text>
                    <QuadrantPill quadrant={candidate.triageResult.quadrant} compact />
                  </View>
                  <Text style={[styles.rankLane, { color: theme.colors.textSoft }]}>
                    {getRankLane(candidate, index)}
                  </Text>
                  <Text style={[styles.rankDecision, { color: theme.colors.text }]}>
                    {getRankDecisionLabel(candidate, index)}
                  </Text>
                  <Text style={[styles.rowCopy, { color: theme.colors.textMuted }]}>
                    {getRankCopy(candidate, index)}
                  </Text>
                  <Text style={[styles.rankNextStep, { color: theme.colors.textMuted }]}>
                    {candidate.triageResult.nextStep}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>
            There is no second item competing for attention right now.
          </Text>
        )}
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Why this first</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>{whyFirst}</Text>
      </NeuCard>

      <NeuButton
        label={shouldSaveWholeBoard ? "Save ranked board" : "Save first move"}
        onPress={() => {
          const savedIds = shouldSaveWholeBoard
            ? saveClarityCandidates(rankedCandidates, claritySession.rawInput)
            : [saveClarityCandidate(firstMove, claritySession.rawInput)];
          clearClarity();
          if (shouldSaveWholeBoard) {
            router.replace("/");
            return;
          }

          router.replace(`/item/${savedIds[0]}`);
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
    gap: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 39,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_500Medium",
  },
  heroCard: {
    gap: 12,
  },
  sectionCard: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  primaryTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "IBMPlexSans_500Medium",
  },
  bodyLead: {
    fontSize: 19,
    lineHeight: 25,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  boardList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  boardChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boardChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "IBMPlexSans_500Medium",
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
  },
  stack: {
    gap: 12,
  },
  row: {
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  rowCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  rankingList: {
    gap: 12,
  },
  rankingRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  rankBadge: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  rankingBody: {
    flex: 1,
    gap: 4,
  },
  rankingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rankingTitle: {
    flex: 1,
  },
  rankLane: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rankDecision: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  rankNextStep: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
