import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../../../src/components/HeaderButton";
import { ScreenShell } from "../../../src/components/ScreenShell";
import { NeuCard } from "../../../src/components/NeuCard";
import { NeuButton } from "../../../src/components/NeuButton";
import { QuadrantPill } from "../../../src/components/QuadrantPill";
import { QUADRANT_META, QUADRANT_ORDER } from "../../../src/constants/quadrants";
import { useAppData } from "../../../src/providers/app-provider";
import { useAppTheme } from "../../../src/providers/theme-provider";
import { goBackOrFallback } from "../../../src/utils/navigation";
import { describeAnswers, formatDateTime } from "../../../src/utils/format";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, deleteItem, moveQuadrant, startRetriage, toggleComplete } = useAppData();
  const { theme } = useAppTheme();

  const item = items.find((entry) => entry.id === id);

  if (!item) {
    return <Redirect href="/" />;
  }

  const answerRows = describeAnswers(item.triageAnswers);

  return (
    <ScreenShell>
      <View style={styles.header}>
        <HeaderButton label="Back" icon="chevron-back" onPress={() => goBackOrFallback("/")} />
        <HeaderButton label="Edit" icon="create-outline" onPress={() => router.push(`/item/${item.id}/edit`)} />
      </View>

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
        <View style={styles.heroTop}>
          <QuadrantPill quadrant={item.quadrant} />
          <Text style={[styles.timestamp, { color: theme.colors.textSoft }]}>
            Updated {formatDateTime(item.updatedAt)}
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.recommendation, { color: theme.colors.text }]}>{item.recommendation}</Text>
        <Text style={[styles.explanation, { color: theme.colors.textMuted }]}>{item.nextStep}</Text>
        {item.notes ? (
          <Text style={[styles.notes, { color: theme.colors.textMuted }]}>{item.notes}</Text>
        ) : null}
      </NeuCard>

      <View style={styles.metricRow}>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
          ]}
        >
          <Ionicons name="flash-outline" size={16} color={theme.colors.accentStrong} />
          <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>Urgency</Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>{item.urgencyScore.toFixed(1)}</Text>
        </View>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.stroke },
          ]}
        >
          <Ionicons name="diamond-outline" size={16} color={theme.colors.accentStrong} />
          <Text style={[styles.metricLabel, { color: theme.colors.textSoft }]}>Importance</Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>{item.importanceScore.toFixed(1)}</Text>
        </View>
      </View>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSoft }]}>Signals</Text>
        <View style={styles.answersColumn}>
          {answerRows.map((entry) => (
            <View key={entry.label} style={styles.answerRow}>
              <Text style={[styles.answerLabel, { color: theme.colors.textSoft }]}>{entry.label}</Text>
              <Text style={[styles.answerValue, { color: theme.colors.text }]}>{entry.value}</Text>
            </View>
          ))}
        </View>
      </NeuCard>

      <NeuCard variant="flat" style={styles.sectionCard}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSoft }]}>Override lane</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.textMuted }]}>
          Move it if your judgment beats the score.
        </Text>
        <View style={styles.moveWrap}>
          {QUADRANT_ORDER.map((quadrant) => {
            const active = quadrant === item.quadrant;
            const colors = theme.quadrants[quadrant];
            return (
              <Pressable
                key={quadrant}
                onPress={() => moveQuadrant(item.id, quadrant)}
                style={[
                  styles.moveChip,
                  {
                    backgroundColor: active ? theme.colors.accentWash : theme.colors.surfaceInset,
                    borderColor: active ? colors.solid : theme.colors.stroke,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.moveLabel,
                    { color: active ? colors.solid : theme.colors.textMuted },
                  ]}
                >
                  {QUADRANT_META[quadrant].shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </NeuCard>

      <NeuButton
        label={item.completed ? "Mark active" : "Mark complete"}
        variant="secondary"
        onPress={() => toggleComplete(item.id)}
      />
      <NeuButton
        label="Refine manually"
        onPress={() => {
          startRetriage(item.id);
          router.push("/triage");
        }}
      />
      <NeuButton
        label="Delete item"
        variant="danger"
        onPress={() =>
          Alert.alert("Delete item?", "This will remove it from local storage.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                deleteItem(item.id);
                router.replace("/");
              },
            },
          ])
        }
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
  heroCard: {
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_500Medium",
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  recommendation: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  explanation: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "IBMPlexSans_500Medium",
  },
  notes: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "IBMPlexSans_500Medium",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    gap: 8,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "IBMPlexSans_700Bold",
  },
  sectionCard: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_500Medium",
  },
  answersColumn: {
    gap: 10,
  },
  answerRow: {
    gap: 4,
  },
  answerLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  answerValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  moveWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moveChip: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
  },
  moveLabel: {
    fontSize: 12,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
});
