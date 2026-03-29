import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { HeaderButton } from "../../../src/components/HeaderButton";
import { ScreenShell } from "../../../src/components/ScreenShell";
import { FormField } from "../../../src/components/FormField";
import { CategoryField } from "../../../src/components/CategoryField";
import { NeuButton } from "../../../src/components/NeuButton";
import { NeuCard } from "../../../src/components/NeuCard";
import { useAppData } from "../../../src/providers/app-provider";
import { useAppTheme } from "../../../src/providers/theme-provider";
import { goBackOrFallback } from "../../../src/utils/navigation";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, startRetriage, updateItemBasics } = useAppData();
  const { theme } = useAppTheme();

  const item = items.find((entry) => entry.id === id);

  const [title, setTitle] = useState(item?.title ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [category, setCategory] = useState(item?.category ?? "");

  if (!item) {
    return <Redirect href="/" />;
  }

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton label="Back" icon="chevron-back" onPress={() => goBackOrFallback(`/item/${item.id}`)} />
        <Text style={[styles.step, { color: theme.colors.textSoft }]}>Edit item</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Tighten the wording.</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Keep the title crisp. Add only useful context.
        </Text>
      </View>

      <NeuCard style={styles.formCard}>
        <FormField label="Title" value={title} onChangeText={setTitle} maxLength={100} />
        <FormField
          label="Notes"
          hint="Optional"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={280}
        />
        <CategoryField value={category} onChange={setCategory} />
      </NeuCard>

      <NeuButton
        label="Save changes"
        onPress={() => {
          updateItemBasics(item.id, {
            title: title.trim(),
            notes: notes.trim(),
            category: category.trim(),
          });
          router.replace(`/item/${item.id}`);
        }}
      />
      <NeuButton
        label="Retriage"
        variant="secondary"
        onPress={() => {
          startRetriage(item.id);
          router.replace("/triage");
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
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  formCard: {
    gap: 14,
  },
});
