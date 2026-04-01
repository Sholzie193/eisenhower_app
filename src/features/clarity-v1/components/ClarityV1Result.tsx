import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../../../components/HeaderButton";
import { NeuButton } from "../../../components/NeuButton";
import { NeuCard } from "../../../components/NeuCard";
import { ScreenShell } from "../../../components/ScreenShell";
import { useAppData } from "../../../providers/app-provider";
import { useAppTheme } from "../../../providers/theme-provider";
import { goBackOrFallback } from "../../../utils/navigation";

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

export function ClarityV1Result() {
  const { claritySession, clearClarity, saveClarityCandidate, startDraft } = useAppData();
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
          <Text style={[styles.label, { color: theme.colors.textSoft }]}>Clarity needs a reliable AI read</Text>
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>
            The app did not get a structured result it trusts, so it is not showing a guessed recommendation.
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
  const considered = dedupeStrings(claritySession.structuredCleanup?.considered_items ?? claritySession.candidates.map((candidate) => candidate.title)).slice(0, 5);
  const contextNotes = dedupeStrings(claritySession.structuredCleanup?.context_notes ?? claritySession.contextHints).slice(0, 3);
  const stillInPlay = claritySession.activeItems.slice(0, 3);
  const whatCanWait = claritySession.laterItems.slice(0, 3);
  const whyFirst = claritySession.structuredCleanup?.why_first || firstMove.calmingWhy;

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
        <Text style={[styles.title, { color: theme.colors.text }]}>Clearer next step</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{claritySession.summary}</Text>
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
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Clearest next move</Text>
        <Text style={[styles.primaryTitle, { color: theme.colors.text }]}>{firstMove.title}</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          {firstMove.triageResult.recommendation}
        </Text>
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Why this first</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>{whyFirst}</Text>
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>Still in play</Text>
        {stillInPlay.length ? (
          <View style={styles.stack}>
            {stillInPlay.map((candidate) => (
              <View key={candidate.id} style={styles.row}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{candidate.title}</Text>
                <Text style={[styles.rowCopy, { color: theme.colors.textMuted }]}>
                  Still meaningful, just not the first move.
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>
            Nothing else needs the same level of foreground attention right now.
          </Text>
        )}
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.label, { color: theme.colors.textSoft }]}>What can wait</Text>
        {whatCanWait.length ? (
          <View style={styles.stack}>
            {whatCanWait.map((candidate) => (
              <View key={candidate.id} style={styles.row}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{candidate.title}</Text>
                <Text style={[styles.rowCopy, { color: theme.colors.textMuted }]}>
                  Lower pressure for now, so it does not need to lead.
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>
            Nothing else needs to be pushed into a later bucket right now.
          </Text>
        )}
      </NeuCard>

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
    lineHeight: 21,
    fontFamily: "IBMPlexSans_500Medium",
  },
  heroCard: {
    gap: 10,
  },
  sectionCard: {
    gap: 10,
  },
  label: {
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
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_500Medium",
  },
  boardList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    fontFamily: "SpaceGrotesk_500Medium",
  },
  rowCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
