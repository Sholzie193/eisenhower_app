import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../src/components/HeaderButton";
import { ScreenShell } from "../src/components/ScreenShell";
import { FormField } from "../src/components/FormField";
import { CategoryField } from "../src/components/CategoryField";
import { NeuButton } from "../src/components/NeuButton";
import { NeuCard } from "../src/components/NeuCard";
import { useAppData } from "../src/providers/app-provider";
import { useAppTheme } from "../src/providers/theme-provider";
import { goBackOrFallback } from "../src/utils/navigation";

export default function AddScreen() {
  const { draft, startDraft, updateDraft } = useAppData();
  const { theme } = useAppTheme();

  useEffect(() => {
    if (!draft || draft.editingId) {
      startDraft();
    }
  }, [draft, startDraft]);

  const workingDraft = draft ?? {
    title: "",
    notes: "",
    category: "",
    triageAnswers: undefined,
  };

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton label="Back" icon="chevron-back" onPress={() => goBackOrFallback("/")} />
        <Text style={[styles.step, { color: theme.colors.textSoft }]}>Step 1 of 3</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Capture the decision.</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Start with the title. Add context only if it helps.
        </Text>
      </View>

      <NeuCard style={styles.formCard}>
        <FormField
          label="Title"
          placeholder="Reply to investor follow-up"
          value={workingDraft.title}
          onChangeText={(title) => updateDraft({ title })}
          autoFocus
          maxLength={100}
        />

        <FormField
          label="Notes"
          hint="Optional"
          placeholder="Useful context for your future self."
          value={workingDraft.notes}
          onChangeText={(notes) => updateDraft({ notes })}
          multiline
          maxLength={280}
        />

        <CategoryField
          value={workingDraft.category}
          onChange={(category) => updateDraft({ category })}
        />
      </NeuCard>

      <NeuButton
        label="Continue"
        disabled={!workingDraft.title.trim()}
        onPress={() => router.push("/triage")}
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
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  formCard: {
    gap: 14,
  },
});
